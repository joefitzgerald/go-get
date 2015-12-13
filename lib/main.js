'use babel'

import {CompositeDisposable} from 'atom'

export default {
  golangconfig: null,
  provider: null,
  subscriptions: null,
  dependenciesInstalled: null,

  activate () {
    this.subscriptions = new CompositeDisposable()
    require('atom-package-deps').install('go-get').then(() => {
      this.dependenciesInstalled = true
    }).catch((e) => {
      console.log(e)
    })
  },

  deactivate () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.goconfig = null
    this.provider = null
    this.dependenciesInstalled = null
  },

  provide () {
    return this.getProvider()
  },

  getProvider () {
    if (this.provider) {
      return this.provider
    }
    return null
    // this.provider = new GocodeProvider(() => { return this.getGoconfig() })
    // this.subscriptions.add(this.provider)
    // return this.provider
  },

  getGoconfig () {
    if (this.goconfig) {
      return this.goconfig
    }
    return false
  },

  consumeGoconfig (service) {
    this.goconfig = service
  }
}
