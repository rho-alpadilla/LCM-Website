// Browser widget type shared by the prayer and giving forms.
interface Window {
  turnstile?: { reset: (widget?: string | HTMLElement) => void };
}
