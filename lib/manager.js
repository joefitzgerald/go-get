'use babel'

import {CompositeDisposable} from 'atom'
import {GetDialog} from './get-dialog'

class Manager {
  constructor (golangconfigFunc) {
    this.golangconfig = golangconfigFunc
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(atom.views.getView(atom.workspace), 'go-get:get-package', () => {
      this.getPackage()
    }))
  }

  getCwd () {
    let cwd = false
    let paths = atom.project.getPaths()
    if (paths && paths.length > 0) {
      cwd = paths[0]
    }
    let editor = atom.workspace.getActiveTextEditor()
    if (!editor) {
      return cwd
    }

    let file = editor.getBuffer().getPath()
    for (let p of paths) {
      if (file.startsWith(p)) {
        cwd = p
      }
    }
    return cwd
  }

  getSelectedText () {
    let editor = atom.workspace.getActiveTextEditor()
    if (!editor) {
      return ''
    }
    let selections = editor.getSelections()
    if (!selections || selections.length < 1) {
      return ''
    }

    return selections[0].getText()
  }

  // Shows a dialog which can be used to perform `go get -u {pack}`. Optionally
  // populates the dialog with the selected text from the active editor.
  getPackage () {
    let selectedText = this.getSelectedText()
    let dialog = new GetDialog(selectedText, (pack) => {
      this.performGet(pack)
    })
    dialog.attach()
  }

  // Runs `go get -u {pack}`.
  // * `options` (optional) {Object} to pass to the go-config executor.
  performGet (pack, options) {
    if (!pack || pack.trim() === '') {
      return Promise.resolve(false)
    }
    let config = this.golangconfig()
    return config.locator.findTool('go', atom.project).then((cmd) => {
      let args = ['get', '-u', pack]
      if (!options || !options.cwd) {
        let cwd = this.getCwd()
        if (cwd && cwd.length > 0) {
          if (!options) {
            options = {cwd: cwd}
          } else {
            options.cwd = cwd
          }
        }
      }

      return config.executor.exec(cmd, args, options).then((r) => {
        if (r.error) {
          if (r.error.code === 'ENOENT') {
            atom.notifications.addError('Missing Go Tool', {
              detail: 'The go tool is required to perform a get. Please ensure you have a go runtime installed: http://golang.org.',
              dismissable: true
            })
          } else {
            console.log(r.error)
            atom.notifications.addError('Error Getting Package', {
              detail: r.error.message,
              dismissable: true
            })
          }
          return {success: false, result: r}
        }

        if (r.exitcode !== 0 || r.stderr && r.stderr.trim() !== '') {
          let message = r.stderr.trim() + '\r\n' + r.stdout.trim()
          atom.notifications.addWarning('Error Getting Package', {
            detail: message.trim(),
            dismissable: true
          })
          return {success: false, result: r}
        }

        atom.notifications.addSuccess(cmd + ' ' + args.join(' '))
        return {success: true, result: r}
      })
    })
  }

  // Creates a notification that can be used to run `go get -u {options.packagePath}`.
  // * `options` (required) {Object}
  //   * `name` (required) {String} e.g. go-plus
  //   * `packageName` (required) {String} e.g. goimports
  //   * `packagePath` (required) {String} e.g. golang.org/x/tools/cmd/goimports
  //   * `type` (required) {String} one of 'missing' or 'outdated' (used to customize the prompt)
  get (options) {
    if (!options || !options.name || !options.packageName || !options.packagePath || !options.type) {
      return Promise.resolve(false)
    }
    if (['missing', 'outdated'].indexOf(options.type) === -1) {
      return Promise.resolve(false)
    }

    let detail = 'The ' + options.name + ' package uses the ' + options.packageName + ' tool, but it cannot be found.'
    if (options.type === 'outdated') {
      detail = 'An update is available for the ' + options.packageName + ' tool. This is used by the ' + options.name + ' package.'
    }
    return new Promise((resolve) => {
      let wasClicked = false
      let notification = atom.notifications.addInfo('Go Get', {
        dismissable: true,
        icon: 'cloud-download',
        detail: detail,
        description: 'Would you like to run `go get -u `[`' + options.packagePath + '`](http://' + options.packagePath + ')?',
        buttons: [{
          text: 'Run Go Get',
          onDidClick: () => {
            wasClicked = true
            notification.dismiss()
            resolve(this.performGet(options.packagePath))
          }
        }]
      })
      notification.onDidDismiss(() => {
        if (!wasClicked) {
          resolve(false)
        }
      })
    })
  }

  // Check returns true if a package is up to date, and false if a package is missing or outdated.
  check (options) {
    return Promise.resolve(true)
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.golangconfig = null
  }
}
export {Manager}
