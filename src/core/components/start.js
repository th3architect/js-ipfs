'use strict'

const series = require('async/series')
const Bitswap = require('ipfs-bitswap')
const setImmediate = require('async/setImmediate')
const promisify = require('promisify-es6')

module.exports = (self) => {
  return promisify((callback) => {
    self.log('starting')

    const done = (err) => {
      if (err) {
        setImmediate(() => self.emit('error', err))
        return callback(err)
      }

      self.state.started()
      self.log('started')
      setImmediate(() => self.emit('start'))
      callback()
    }

    if (self.state.state() !== 'stopped') {
      return done(new Error('Not able to start from state: ' + self.state.state()))
    }

    self.log('starting')
    self.state.start()

    series([
      (cb) => {
        self._repo.closed
          ? self._repo.open(cb)
          : cb()
      },
      (cb) => self.preStart(cb),
      (cb) => self.libp2p.start(cb)
    ], (err) => {
      if (err) { return done(err) }

      self._bitswap = new Bitswap(
        self._libp2pNode,
        self._repo.blocks,
        { statsEnabled: true }
      )

      self._bitswap.start()
      self._blockService.setExchange(self._bitswap)
      done()
    })
  })
}
