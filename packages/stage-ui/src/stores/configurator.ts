import { defineStore } from 'pinia'

import { useModsServerChannelStore } from './mods/api/channel-server'

export const useConfiguratorByModsChannelServer = defineStore('configurator:adapter:proj-airi:server-sdk', () => {
  const serverChannelStore = useModsServerChannelStore()

  async function updateFor(moduleName: string, config: Record<string, unknown>) {
    await serverChannelStore.ensureConnected()
    serverChannelStore.send({
      type: 'ui:configure' as const,
      data: {
        moduleName,
        config,
      },
    })
  }

  return {
    updateFor,
  }
})
