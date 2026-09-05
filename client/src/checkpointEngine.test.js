import { expect, test } from 'vitest'
import { nodeRealness } from './checkpointEngine.js'

test('rx-only unicast IP is unconfirmed (phantom scan target)', () => {
  expect(nodeRealness({ ip: '192.168.1.99', packetsTx: 0, packetsRx: 3 })).toEqual({ status: 'unconfirmed' })
})

test('any transmitted packet confirms a unicast host', () => {
  expect(nodeRealness({ ip: '192.168.1.10', packetsTx: 1, packetsRx: 4 })).toEqual({ status: 'confirmed' })
})

test('presence of a MAC confirms a L2-reachable peer', () => {
  expect(nodeRealness({ ip: '192.168.1.11', packetsTx: 0, packetsRx: 2, mac: 'aa:bb:cc:dd:ee:ff' })).toEqual({ status: 'confirmed' })
})

test('multicast/broadcast/loopback/link-local are special groups, never confirmed hosts', () => {
  expect(nodeRealness({ ip: '224.0.0.251', packetsTx: 0, packetsRx: 1 })).toEqual({ status: 'special' })
  expect(nodeRealness({ ip: '255.255.255.255', packetsTx: 0, packetsRx: 1 })).toEqual({ status: 'special' })
  expect(nodeRealness({ ip: '127.0.0.1', packetsTx: 0, packetsRx: 1 })).toEqual({ status: 'special' })
})

test('nodeRealness never throws on unknown ip format', () => {
  expect(nodeRealness({ ip: 'garbage', packetsTx: 0, packetsRx: 0 })).toEqual({ status: 'special' })
})