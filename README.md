# stdio-JSONRPC

Leverage [JSON-RPC](https://www.jsonrpc.org) to communicate with another process via stdio

## Installation

```bash
npm install stdio-jsonrpc
```

## Usage

```js
const {setup, sendNotification, sendRequest, RPCError} = require('stdio-jsonrpc')

setup({
  onNotification(method, params) {
    // handle a notification
  },
  onRequest(method, params, callback) {
    // handle a request

    callback(new RPCError.MethodNotFound())
  }
})

sendRequest('ping').then(pong => {
  sendNotification('pong', { msg: pong })
})
.catch(err => {
  // something bad happened
})
```

## API

```
setup: ({
  onNotification: (method: string, params: any) -> void
  onRequest: (method: string, params: any, callback: (error: Error | null, result: any) -> void) -> void
}) -> void

sendNotification: (method: string, params?: any) -> void

sendRequest: (method: string, params?: any, timeout?: Number) -> Promise<any>

RPCError: {
  ParseError: (data: any) -> Error
  InvalidRequest: (data: any) -> Error
  MethodNotFound: (data: any) -> Error
  InvalidParams: (data: any) -> Error
  InternalError: (data: any) -> Error
}
```

## License

MIT
