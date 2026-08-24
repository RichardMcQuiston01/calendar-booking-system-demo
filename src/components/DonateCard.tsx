/**
 * React / Next.js variant of the floating donate card.
 *
 * Pair with donate-widget.css (import it, or port the rules into your styling
 * system). Props exist so a project can point at a different Stripe link or
 * QR path without editing the component.
 */
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';

const STORAGE_KEY = 'donate-card-dismissed';

export interface DonateCardProps {
  /** Stripe payment link the card sends people to. */
  readonly donateUrl?: string;
  /** Path to the generated QR SVG, relative to the served root. */
  readonly qrSrc?: string;
  /** Set false to make the card non-dismissible (not recommended). */
  readonly dismissible?: boolean;
}

export function DonateCard({
  donateUrl = 'https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800',
  qrSrc = '/donate.svg',
  dismissible = true,
}: DonateCardProps): ReactElement | null {
  // Read localStorage synchronously in the initializer rather than via an
  // effect: this app is a client-only Vite SPA (no SSR to break), and doing
  // it here avoids a flash-then-hide render as well as this repo's stricter
  // react-hooks lint rule against setState calls inside an effect body.
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const handleDismiss = useCallback((): void => {
    setIsVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* Non-fatal. */
    }
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="donate-card" id="donateCard" aria-labelledby="donateCardTitle">
      {dismissible ? (
        <button
          className="donate-card__dismiss"
          type="button"
          aria-label="Dismiss support message"
          onClick={handleDismiss}
        >
          &times;
        </button>
      ) : null}

      <h2 className="donate-card__title" id="donateCardTitle">
        <span className="donate-card__heart" aria-hidden="true">
          &#9829;
        </span>
        Support this project
      </h2>

      <p className="donate-card__body">
        If this app, code, or repository has helped you or someone you know, please consider
        donating. I appreciate any help to offset the costs of development and/or AI Credits.
      </p>

      <div className="donate-card__qr">
        <img src={qrSrc} alt="QR code linking to the Stripe donation page" width={180} height={180} />
      </div>

      <a
        className="donate-card__link"
        href={donateUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Donate via Stripe, opens in a new tab"
      >
        Donate via Stripe <span aria-hidden="true">&rarr;</span>
      </a>
    </aside>
  );
}
