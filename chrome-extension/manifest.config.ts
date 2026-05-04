import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Brain Dump',
  version: '0.1.0',
  description: 'AI side panel connected to your Obsidian vault — open with Cmd+Shift+O',
  side_panel: { default_path: 'index.html' },
  background: { service_worker: 'src/background.ts', type: 'module' },
  options_ui: { page: 'options.html', open_in_tab: true },
  action: { default_title: 'Open Brain Dump' },
  permissions: ['sidePanel', 'tabs', 'activeTab', 'storage', 'scripting'],
  host_permissions: ['<all_urls>'],
  commands: {
    'open-launcher': {
      suggested_key: { default: 'Ctrl+Shift+L', mac: 'Command+Shift+O' },
      description: 'Open Brain Dump side panel',
    },
  },
  icons: { '16': 'icons/16.png', '48': 'icons/48.png', '128': 'icons/128.png' },
})
