import BasePlayer from '../js/common.js'

class ShakaPlayer extends BasePlayer {
  async initPlayer () {
    shaka.polyfill.installAll()
    shaka.log.setLevel(parseInt(this.logLevel))

    switch (parseInt(this.logLevel)) {
      case 6:
        shaka.log.v2 = this.interceptLog('V2')
        break
      case 5:
        shaka.log.v1 = this.interceptLog('V1')
        break
      case 4:
        shaka.log.debug = this.interceptLog('DEBUG')
        break
      case 3:
        shaka.log.info = this.interceptLog('INFO')
        break
      case 2:
        shaka.log.warning = this.interceptLog('WARNING')
        break
      case 1:
        shaka.log.error = this.interceptLog('ERROR')
        break
    }

    if (this.manifest) {
      const player = new shaka.Player(this.video)
      window.player = player
      player.addEventListener('error', this.ErrHandler.bind(this))

      if (this.playReadyLicenseUrl || this.widevineLicenseUrl) {
        player.configure({
          drm: {
            servers: {
              'com.widevine.alpha': this.widevineLicenseUrl,
              'com.microsoft.playready': this.playReadyLicenseUrl
            }
          }
        })
      }

      if (this.token) {
        player.getNetworkingEngine().registerRequestFilter((type, request) => {
          if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
            request.headers.Authorization = 'Bearer ' + this.token
          }
        })
      }

      player.setTextTrackVisibility(true)
      if (this.caption) {
        player.configure('streaming.alwaysStreamText', true)
      }

      if (this.fairPlayCertificate) {
        try {
          const req = await fetch(this.fairPlayCertificate)
          const cert = await req.arrayBuffer()
          player.configure('drm.advanced.com\\.apple\\.fps\\.1_0.serverCertificate', new Uint8Array(cert))
        } catch (error) {
          this.addMessage('ERROR', 'Load FairPlay Certificate Error: ' + error)
          return false
        }
      }

      player.load(this.manifest).then(() => {
        if (this.caption) {
          player.addTextTrack(this.caption, 'en', 'caption', 'text/vtt')
          const tracks = player.getTextTracks()
          player.selectTextTrack(tracks[0])
        }
      }).catch((error) => {
        this.addMessage('ERROR', 'Load Manifest Error: ' + error)
        return false
      })
    }

    return true
  }

  ErrHandler (err) {
    if (err.detail.code === shaka.util.Error.Code.LICENSE_REQUEST_FAILED) {
      const originalError = err.detail.data[0]
      this.addMessage('ERROR', 'HTTP Error ' + originalError.data[1] + ' at ' + originalError.data[0])
    }
  }

  // override method
  getPlayerInfo () {
    return `Shaka player ${shaka.Player.version}`
  }

  // override method
  getPluginsInfo () {
    const plugins = []
    plugins.Mux = 'v5.6.3'
    return plugins
  }
}

const shakaPlayer = new ShakaPlayer()
shakaPlayer.initPlayer()
