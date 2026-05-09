import "react-native-get-random-values"
import "react-native-url-polyfill/auto"

import { decode, encode } from "base-64"
import { Buffer } from "buffer"
import { install } from "react-native-quick-crypto"
import { TextDecoder, TextEncoder } from "text-encoding"

install()

global.Buffer = global.Buffer || Buffer
global.TextEncoder = global.TextEncoder || TextEncoder
global.TextDecoder = global.TextDecoder || TextDecoder

if (!global.window) {
  global.window = global
}

if (!global.btoa) {
  global.btoa = encode
}

if (!global.atob) {
  global.atob = decode
}

if (!global.window.btoa) {
  global.window.btoa = global.btoa
}

if (!global.window.atob) {
  global.window.atob = global.atob
}
