import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Dark } from 'quasar'

export async function applyStatusBar(isDark) {
  if (!Capacitor.isNativePlatform()) return

  await StatusBar.setOverlaysWebView({ overlay: false })

  // Style.Dark = light icons/text (use on dark backgrounds)
  // Style.Light = dark icons/text (use on light backgrounds)
  await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })

  await StatusBar.setBackgroundColor({ color: '#121212' })
}

export default () => {
  // run once on boot
  applyStatusBar(Dark.isActive)

  // re-run whenever dark mode toggles
  Dark.set(Dark.isActive) // ensure initial state resolved
}
