const RPCError = {
  ParseError(data) {
    // Invalid JSON was received by the server.
    // An error occurred on the server while parsing the JSON text.
    const err = new Error('Parse error')
    err.code = -32700
    err.data = data
    return err
  },
  InvalidRequest(data) {
    // The JSON sent is not a valid Request object.
    const err = new Error('Invalid Request')
    err.code = -32600
    err.data = data
    return err
  },
  MethodNotFound(data) {
    // The method does not exist / is not available.
    const err = new Error('Method not found')
    err.code = -32601
    err.data = data
    return err
  },
  InvalidParams(data) {
    // Invalid method parameter(s).
    const err = new Error('Invalid params')
    err.code = -32602
    err.data = data
    return err
  },
  InternalError(data) {
    // Invalid method parameter(s).
    const err = new Error('Internal error')
    err.code = -32603
    err.data = data
    return err
  }
}

process.stdin.setEncoding('utf8');

process.stdin.on('readable', () => {
  let data = ''
  let chunk
  // Use a loop to make sure we read all available data.
  while ((chunk = process.stdin.read()) !== null) {
    data += chunk
  }

  handleRaw(data)
})

let rpcIndex = 0
let pending = {}

function sendJson(req) {
  try {
    const data = JSON.stringify(req) + '\n'
    process.stdout.write(data)
  } catch (err) {
    console.error(err)
  }
}

function sendResult(id, result) {
  sendJson({
    id,
    result
  })
}

function sendError(id, error) {
  const errorObject = {
    code: error.code,
    message: error.message,
    data: error.data
  }
  sendJson({
    id,
    error: errorObject
  })
}

function handleRaw(data) {
  try {
    data.split('\n').forEach(bunch => {
      bunch = bunch.trim()
      if (!bunch) {
        return
      }
      const json = JSON.parse(bunch)
      handleRpc(json)
    })
  } catch (err) {
    console.error(err)
    console.error(data)
  }
}

function handleRpc(json) {
  if (typeof json.id !== 'undefined') {
    if (typeof json.result !== 'undefined' || json.error) {
      const callback = pending[json.id]
      if (!callback) {
        sendError(json.id, new RPCError.InvalidRequest())
        return
      }
      if (callback.timeout) {
        clearTimeout(callback.timeout)
      }
      delete pending[json.id]
      callback(json.error, json.result)
    } else {
      handleRequest(json)
    }
  } else {
    handleNotification(json)
  }
}

let onRequest = () => {}
let onNotification = () => {}

function handleNotification(json) {
  if (!json.method) {
    return
  }
  onNotification(json.method, json.params)
}

function handleRequest(json) {
  if (!json.method) {
    sendError(json.id, new RPCError.InvalidRequest())
    return
  }
  onRequest(json.method, json.params, (error, result) => {
    if (error) {
      sendError(json.id, error)
      return
    }
    sendResult(json.id, result)
  })
}

module.exports.setup = (callbacks) => {
  onRequest = callbacks.onRequest
  onNotification = callbacks.onNotification
}

module.exports.sendNotification = (method, params) => {
  sendJson({ method, params })
}

module.exports.sendRequest = (method, params, timeout) => {
  return new Promise((resolve, reject) => {
    const id = rpcIndex
    const req = { method, params, id }
    rpcIndex += 1
    const callback = (err, result) => {
      if (err) {
        const jsError = new Error(err.message)
        jsError.code = err.code
        jsError.data = err.data
        reject(jsError)
        return
      }
      resolve(result)
    }

    // set a default timeout
    callback.timeout = setTimeout(() => {
      delete pending[id]
      reject(new Error('Request ' + method + ' timed out.'))
    }, timeout || 3000)

    pending[id] = callback
    sendJson(req)
  })
}

module.exports.RPCError = RPCError
