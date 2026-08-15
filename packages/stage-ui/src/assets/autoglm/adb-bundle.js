const __defProp = Object.defineProperty
function __export (target, all) {
  for (const name in all)
    __defProp(target, name, { get: all[name], enumerable: true })
}

// node_modules/@yume-chan/async/esm/promise-resolver.js
const PromiseResolver = class {
  #promise
  get promise() {
    return this.#promise
  }

  #resolve
  #reject
  #state = 'running'
  get state() {
    return this.#state
  }

  constructor() {
    this.#promise = new Promise((resolve, reject) => {
      this.#resolve = resolve
      this.#reject = reject
    })
  }

  resolve = (value) => {
    this.#resolve(value)
    this.#state = 'resolved'
  }

  reject = (reason) => {
    this.#reject(reason)
    this.#state = 'rejected'
  }
}

// node_modules/@yume-chan/async/esm/async-operation-manager.js
const AsyncOperationManager = class {
  nextId
  pendingResolvers = /* @__PURE__ */ new Map()
  constructor(startId = 0) {
    this.nextId = startId
  }

  add() {
    const id = this.nextId++
    const resolver = new PromiseResolver()
    this.pendingResolvers.set(id, resolver)
    return [id, resolver.promise]
  }

  getResolver(id) {
    if (!this.pendingResolvers.has(id)) {
      return null
    }
    const resolver = this.pendingResolvers.get(id)
    this.pendingResolvers.delete(id)
    return resolver
  }

  resolve(id, result) {
    const resolver = this.getResolver(id)
    if (resolver !== null) {
      resolver.resolve(result)
      return true
    }
    return false
  }

  reject(id, reason) {
    const resolver = this.getResolver(id)
    if (resolver !== null) {
      resolver.reject(reason)
      return true
    }
    return false
  }
}

// node_modules/@yume-chan/async/esm/delay.js
function delay(time) {
  return new Promise((resolve) => {
    globalThis.setTimeout(() => resolve(), time)
  })
}

// node_modules/@yume-chan/async/esm/maybe-promise.js
function isPromiseLike(value) {
  return typeof value === 'object' && value !== null && 'then' in value
}

// node_modules/@yume-chan/struct/esm/bipedal.js
function advance(iterator, next) {
  while (true) {
    const { done, value } = iterator.next(next)
    if (done) {
      return value
    }
    if (isPromiseLike(value)) {
      return value.then(value2 => advance(iterator, { resolved: value2 }), error => advance(iterator, { error }))
    }
    next = value
  }
}
// @__NO_SIDE_EFFECTS__
function bipedal(fn, bindThis) {
  function result(...args) {
    const iterator = fn.call(this, function* (value) {
      if (isPromiseLike(value)) {
        const result2 = yield value
        if ('resolved' in result2) {
          return result2.resolved
        }
        else {
          throw result2.error
        }
      }
      return value
    }, ...args)
    return advance(iterator, void 0)
  }
  if (bindThis) {
    return result.bind(bindThis)
  }
  else {
    return result
  }
}

// node_modules/@yume-chan/struct/esm/field/serialize.js
function defaultFieldSerializer(serializer) {
  return (source, context) => {
    if ('buffer' in context) {
      const buffer2 = serializer(source, context)
      context.buffer.set(buffer2, context.index)
      return buffer2.length
    }
    else {
      return serializer(source, context)
    }
  }
}
function byobFieldSerializer(size, serializer) {
  return (source, context) => {
    if ('buffer' in context) {
      context.index ??= 0
      serializer(source, context)
      return size
    }
    else {
      const buffer2 = new Uint8Array(size)
      serializer(source, {
        buffer: buffer2,
        index: 0,
        littleEndian: context.littleEndian,
      })
      return buffer2
    }
  }
}

// node_modules/@yume-chan/struct/esm/field/factory.js
// @__NO_SIDE_EFFECTS__
function _field(size, type, serialize, deserialize, options) {
  const field2 = {
    size,
    type,
    serialize: type === 'default' ? defaultFieldSerializer(serialize) : byobFieldSerializer(size, serialize),
    deserialize: bipedal(deserialize),
    omitInit: options?.omitInit,
  }
  if (options?.init) {
    field2.init = options.init
  }
  return field2
}
const field = _field

// node_modules/@yume-chan/struct/esm/buffer.js
const EmptyUint8Array = new Uint8Array(0)
function copyMaybeDifferentLength(dest, source, index, length) {
  if (source.length < length) {
    dest.set(source, index)
    dest.fill(0, index + source.length, index + length)
  }
  else if (source.length === length) {
    dest.set(source, index)
  }
  else {
    dest.set(source.subarray(0, length), index)
  }
}
// @__NO_SIDE_EFFECTS__
function buffer(lengthOrField, converter) {
  if (typeof lengthOrField === 'number') {
    let serialize
    let deserialize2
    let init2
    if (lengthOrField === 0) {
      serialize = () => {
      }
      if (converter) {
        deserialize2 = function* () {
          return converter.convert(EmptyUint8Array)
        }
      }
      else {
        deserialize2 = function* () {
          return EmptyUint8Array
        }
      }
    }
    else {
      serialize = (value, { buffer: buffer2, index }) => copyMaybeDifferentLength(buffer2, value, index, lengthOrField)
      if (converter) {
        deserialize2 = function* (then, reader) {
          const array = reader.readExactly(lengthOrField)
          return converter.convert(yield* then(array))
        }
        init2 = value => converter.back(value)
      }
      else {
        deserialize2 = function* (_then, reader) {
          const array = reader.readExactly(lengthOrField)
          return array
        }
      }
    }
    return field(lengthOrField, 'byob', serialize, deserialize2, { init: init2 })
  }
  if ((typeof lengthOrField === 'object' || typeof lengthOrField === 'function') && 'serialize' in lengthOrField) {
    let deserialize2
    let init2
    if (converter) {
      deserialize2 = function* (then, reader, context) {
        const length = yield* then(lengthOrField.deserialize(reader, context))
        const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array
        return converter.convert(yield* then(array))
      }
      init2 = value => converter.back(value)
    }
    else {
      deserialize2 = function* (then, reader, context) {
        const length = yield* then(lengthOrField.deserialize(reader, context))
        const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array
        return array
      }
    }
    return field(lengthOrField.size, 'default', (value, { littleEndian }) => {
      if (lengthOrField.type === 'default') {
        const lengthBuffer = lengthOrField.serialize(value.length, {
          littleEndian,
        })
        if (value.length === 0) {
          return lengthBuffer
        }
        const result = new Uint8Array(lengthBuffer.length + value.length)
        result.set(lengthBuffer, 0)
        result.set(value, lengthBuffer.length)
        return result
      }
      else {
        const result = new Uint8Array(lengthOrField.size + value.length)
        lengthOrField.serialize(value.length, {
          buffer: result,
          index: 0,
          littleEndian,
        })
        result.set(value, lengthOrField.size)
        return result
      }
    }, deserialize2, { init: init2 })
  }
  if (typeof lengthOrField === 'string') {
    let deserialize2
    let init2
    if (converter) {
      deserialize2 = function* (then, reader, { dependencies }) {
        const length = dependencies[lengthOrField]
        const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array
        return converter.convert(yield* then(array))
      }
      init2 = (value, dependencies) => {
        const array = converter.back(value)
        dependencies[lengthOrField] = array.length
        return array
      }
    }
    else {
      deserialize2 = function* (_then, reader, { dependencies }) {
        const length = dependencies[lengthOrField]
        const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array
        return array
      }
      init2 = (value, dependencies) => {
        const array = value
        dependencies[lengthOrField] = array.length
        return array
      }
    }
    return field(0, 'default', source => source, deserialize2, { init: init2 })
  }
  let deserialize
  let init
  if (converter) {
    deserialize = function* (then, reader, { dependencies }) {
      const rawLength = dependencies[lengthOrField.field]
      const length = lengthOrField.convert(rawLength)
      const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array
      return converter.convert(yield* then(array))
    }
    init = (value, dependencies) => {
      const array = converter.back(value)
      dependencies[lengthOrField.field] = lengthOrField.back(array.length)
      return array
    }
  }
  else {
    deserialize = function* (_then, reader, { dependencies }) {
      const rawLength = dependencies[lengthOrField.field]
      const length = lengthOrField.convert(rawLength)
      const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array
      return array
    }
    init = (value, dependencies) => {
      const array = value
      dependencies[lengthOrField.field] = lengthOrField.back(array.length)
      return array
    }
  }
  return field(0, 'default', source => source, deserialize, { init })
}

// node_modules/@yume-chan/struct/esm/readable.js
const ExactReadableEndedError = class extends Error {
  constructor() {
    super('ExactReadable ended')
  }
}
const Uint8ArrayExactReadable = class {
  #data
  #position
  get position() {
    return this.#position
  }

  constructor(data) {
    this.#data = data
    this.#position = 0
  }

  readExactly(length) {
    if (this.#position + length > this.#data.length) {
      throw new ExactReadableEndedError()
    }
    const result = this.#data.subarray(this.#position, this.#position + length)
    this.#position += length
    return result
  }
}

// node_modules/@yume-chan/struct/esm/struct.js
const StructDeserializeError = class extends Error {
  constructor(message) {
    super(message)
  }
}
const StructNotEnoughDataError = class extends StructDeserializeError {
  constructor() {
    super('The underlying readable was ended before the struct was fully deserialized')
  }
}
const StructEmptyError = class extends StructDeserializeError {
  constructor() {
    super('The underlying readable doesn\'t contain any more struct')
  }
}
// @__NO_SIDE_EFFECTS__
function struct(fields, options) {
  const fieldList = Object.entries(fields)
  let size = 0
  let byob = true
  for (const [, field2] of fieldList) {
    size += field2.size
    if (byob && field2.type !== 'byob') {
      byob = false
    }
  }
  const littleEndian = options.littleEndian
  const extra = options.extra ? Object.getOwnPropertyDescriptors(options.extra) : void 0
  return {
    littleEndian,
    fields,
    extra: options.extra,
    type: byob ? 'byob' : 'default',
    size,
    serialize(source, bufferOrContext) {
      const temp = { ...source }
      for (const [key, field2] of fieldList) {
        if (key in temp && 'init' in field2) {
          const result = field2.init?.(temp[key], temp)
          temp[key] = result
        }
      }
      const sizes = new Array(fieldList.length)
      const buffers = new Array(fieldList.length)
      {
        const context2 = { littleEndian }
        for (const [index2, [key, field2]] of fieldList.entries()) {
          if (field2.type === 'byob') {
            sizes[index2] = field2.size
          }
          else {
            buffers[index2] = field2.serialize(temp[key], context2)
            sizes[index2] = buffers[index2].length
          }
        }
      }
      const size2 = sizes.reduce((sum, size3) => sum + size3, 0)
      let externalBuffer
      let buffer2
      let index
      if (bufferOrContext instanceof Uint8Array) {
        if (bufferOrContext.length < size2) {
          throw new Error('Buffer too small')
        }
        externalBuffer = true
        buffer2 = bufferOrContext
        index = 0
      }
      else if (typeof bufferOrContext === 'object' && 'buffer' in bufferOrContext) {
        externalBuffer = true
        buffer2 = bufferOrContext.buffer
        index = bufferOrContext.index ?? 0
        if (buffer2.length - index < size2) {
          throw new Error('Buffer too small')
        }
      }
      else {
        externalBuffer = false
        buffer2 = new Uint8Array(size2)
        index = 0
      }
      const context = {
        buffer: buffer2,
        index,
        littleEndian,
      }
      for (const [index2, [key, field2]] of fieldList.entries()) {
        if (buffers[index2]) {
          buffer2.set(buffers[index2], context.index)
        }
        else {
          field2.serialize(temp[key], context)
        }
        context.index += sizes[index2]
      }
      if (externalBuffer) {
        return size2
      }
      else {
        return buffer2
      }
    },
    deserialize: bipedal(function* (then, reader) {
      const startPosition = reader.position
      const result = {}
      const context = {
        dependencies: result,
        littleEndian,
      }
      try {
        for (const [key, field2] of fieldList) {
          result[key] = yield* then(field2.deserialize(reader, context))
        }
      }
      catch (e) {
        if (!(e instanceof ExactReadableEndedError)) {
          throw e
        }
        if (reader.position === startPosition) {
          throw new StructEmptyError()
        }
        else {
          throw new StructNotEnoughDataError()
        }
      }
      if (extra) {
        Object.defineProperties(result, extra)
      }
      if (options.postDeserialize) {
        return options.postDeserialize.call(result, result)
      }
      else {
        return result
      }
    }),
  }
}

// node_modules/@yume-chan/struct/esm/extend.js
// @__NO_SIDE_EFFECTS__
function extend(base, fields, options) {
  return struct(Object.assign({}, base.fields, fields), {
    littleEndian: options?.littleEndian ?? base.littleEndian,
    extra: base.extra,
    postDeserialize: options?.postDeserialize,
  })
}

// node_modules/@yume-chan/no-data-view/esm/int32.js
// @__NO_SIDE_EFFECTS__
function getInt32(buffer2, offset, littleEndian) {
  return littleEndian ? buffer2[offset] | buffer2[offset + 1] << 8 | buffer2[offset + 2] << 16 | buffer2[offset + 3] << 24 : buffer2[offset] << 24 | buffer2[offset + 1] << 16 | buffer2[offset + 2] << 8 | buffer2[offset + 3]
}
function setInt32(buffer2, offset, value, littleEndian) {
  if (littleEndian) {
    buffer2[offset] = value
    buffer2[offset + 1] = value >> 8
    buffer2[offset + 2] = value >> 16
    buffer2[offset + 3] = value >> 24
  }
  else {
    buffer2[offset] = value >> 24
    buffer2[offset + 1] = value >> 16
    buffer2[offset + 2] = value >> 8
    buffer2[offset + 3] = value
  }
}

// node_modules/@yume-chan/no-data-view/esm/int64.js
function setInt64LittleEndian(buffer2, offset, value) {
  buffer2[offset] = Number(value & 0xFFn)
  buffer2[offset + 1] = Number(value >> 8n & 0xFFn)
  buffer2[offset + 2] = Number(value >> 16n & 0xFFn)
  buffer2[offset + 3] = Number(value >> 24n & 0xFFn)
  buffer2[offset + 4] = Number(value >> 32n & 0xFFn)
  buffer2[offset + 5] = Number(value >> 40n & 0xFFn)
  buffer2[offset + 6] = Number(value >> 48n & 0xFFn)
  buffer2[offset + 7] = Number(value >> 56n & 0xFFn)
}
function setInt64BigEndian(buffer2, offset, value) {
  buffer2[offset] = Number(value >> 56n & 0xFFn)
  buffer2[offset + 1] = Number(value >> 48n & 0xFFn)
  buffer2[offset + 2] = Number(value >> 40n & 0xFFn)
  buffer2[offset + 3] = Number(value >> 32n & 0xFFn)
  buffer2[offset + 4] = Number(value >> 24n & 0xFFn)
  buffer2[offset + 5] = Number(value >> 16n & 0xFFn)
  buffer2[offset + 6] = Number(value >> 8n & 0xFFn)
  buffer2[offset + 7] = Number(value & 0xFFn)
}

// node_modules/@yume-chan/no-data-view/esm/uint32.js
// @__NO_SIDE_EFFECTS__
function getUint32LittleEndian(buffer2, offset) {
  return (buffer2[offset] | buffer2[offset + 1] << 8 | buffer2[offset + 2] << 16 | buffer2[offset + 3] << 24) >>> 0
}
// @__NO_SIDE_EFFECTS__
function getUint32(buffer2, offset, littleEndian) {
  return littleEndian ? (buffer2[offset] | buffer2[offset + 1] << 8 | buffer2[offset + 2] << 16 | buffer2[offset + 3] << 24) >>> 0 : (buffer2[offset] << 24 | buffer2[offset + 1] << 16 | buffer2[offset + 2] << 8 | buffer2[offset + 3]) >>> 0
}
function setUint32LittleEndian(buffer2, offset, value) {
  buffer2[offset] = value
  buffer2[offset + 1] = value >> 8
  buffer2[offset + 2] = value >> 16
  buffer2[offset + 3] = value >> 24
}
function setUint32(buffer2, offset, value, littleEndian) {
  if (littleEndian) {
    buffer2[offset] = value
    buffer2[offset + 1] = value >> 8
    buffer2[offset + 2] = value >> 16
    buffer2[offset + 3] = value >> 24
  }
  else {
    buffer2[offset] = value >> 24
    buffer2[offset + 1] = value >> 16
    buffer2[offset + 2] = value >> 8
    buffer2[offset + 3] = value
  }
}

// node_modules/@yume-chan/no-data-view/esm/uint64.js
function getUint64BigEndian(buffer2, offset) {
  return BigInt(buffer2[offset]) << 56n | BigInt(buffer2[offset + 1]) << 48n | BigInt(buffer2[offset + 2]) << 40n | BigInt(buffer2[offset + 3]) << 32n | BigInt(buffer2[offset + 4]) << 24n | BigInt(buffer2[offset + 5]) << 16n | BigInt(buffer2[offset + 6]) << 8n | BigInt(buffer2[offset + 7])
}
function getUint64(buffer2, offset, littleEndian) {
  return littleEndian ? BigInt(buffer2[offset]) | BigInt(buffer2[offset + 1]) << 8n | BigInt(buffer2[offset + 2]) << 16n | BigInt(buffer2[offset + 3]) << 24n | BigInt(buffer2[offset + 4]) << 32n | BigInt(buffer2[offset + 5]) << 40n | BigInt(buffer2[offset + 6]) << 48n | BigInt(buffer2[offset + 7]) << 56n : BigInt(buffer2[offset]) << 56n | BigInt(buffer2[offset + 1]) << 48n | BigInt(buffer2[offset + 2]) << 40n | BigInt(buffer2[offset + 3]) << 32n | BigInt(buffer2[offset + 4]) << 24n | BigInt(buffer2[offset + 5]) << 16n | BigInt(buffer2[offset + 6]) << 8n | BigInt(buffer2[offset + 7])
}
function setUint64(buffer2, offset, value, littleEndian) {
  if (littleEndian) {
    buffer2[offset] = Number(value & 0xFFn)
    buffer2[offset + 1] = Number(value >> 8n & 0xFFn)
    buffer2[offset + 2] = Number(value >> 16n & 0xFFn)
    buffer2[offset + 3] = Number(value >> 24n & 0xFFn)
    buffer2[offset + 4] = Number(value >> 32n & 0xFFn)
    buffer2[offset + 5] = Number(value >> 40n & 0xFFn)
    buffer2[offset + 6] = Number(value >> 48n & 0xFFn)
    buffer2[offset + 7] = Number(value >> 56n & 0xFFn)
  }
  else {
    buffer2[offset] = Number(value >> 56n & 0xFFn)
    buffer2[offset + 1] = Number(value >> 48n & 0xFFn)
    buffer2[offset + 2] = Number(value >> 40n & 0xFFn)
    buffer2[offset + 3] = Number(value >> 32n & 0xFFn)
    buffer2[offset + 4] = Number(value >> 24n & 0xFFn)
    buffer2[offset + 5] = Number(value >> 16n & 0xFFn)
    buffer2[offset + 6] = Number(value >> 8n & 0xFFn)
    buffer2[offset + 7] = Number(value & 0xFFn)
  }
}

// node_modules/@yume-chan/struct/esm/number.js
// @__NO_SIDE_EFFECTS__
function number(size, serialize, deserialize) {
  const fn = () => fn
  Object.assign(fn, field(size, 'byob', serialize, deserialize))
  return fn
}
const u8 = /* @__PURE__ */ number(1, (value, { buffer: buffer2, index }) => {
  buffer2[index] = value
}, function* (then, reader) {
  const data = yield* then(reader.readExactly(1))
  return data[0]
})
const u32 = /* @__PURE__ */ number(4, (value, { buffer: buffer2, index, littleEndian }) => {
  setUint32(buffer2, index, value, littleEndian)
}, function* (then, reader, { littleEndian }) {
  const data = yield* then(reader.readExactly(4))
  return getUint32(data, 0, littleEndian)
})
const s32 = /* @__PURE__ */ number(4, (value, { buffer: buffer2, index, littleEndian }) => {
  setInt32(buffer2, index, value, littleEndian)
}, function* (then, reader, { littleEndian }) {
  const data = yield* then(reader.readExactly(4))
  return getInt32(data, 0, littleEndian)
})
const u64 = /* @__PURE__ */ number(8, (value, { buffer: buffer2, index, littleEndian }) => {
  setUint64(buffer2, index, value, littleEndian)
}, function* (then, reader, { littleEndian }) {
  const data = yield* then(reader.readExactly(8))
  return getUint64(data, 0, littleEndian)
})

// node_modules/@yume-chan/struct/esm/utils.js
const { TextEncoder, TextDecoder } = globalThis
const SharedEncoder = /* @__PURE__ */ new TextEncoder()
const SharedDecoder = /* @__PURE__ */ new TextDecoder()
// @__NO_SIDE_EFFECTS__
function encodeUtf8(input) {
  return SharedEncoder.encode(input)
}
// @__NO_SIDE_EFFECTS__
function decodeUtf8(buffer2) {
  return SharedDecoder.decode(buffer2)
}

// node_modules/@yume-chan/struct/esm/string.js
function string(lengthOrField) {
  const field2 = buffer(lengthOrField, {
    convert: decodeUtf8,
    back: encodeUtf8,
  });
  field2.as = () => field2
  return field2
}

// node_modules/@yume-chan/stream-extra/esm/stream.js
const { AbortController } = globalThis
const ReadableStream = /* @__PURE__ */ (() => {
  const { ReadableStream: ReadableStream2 } = globalThis
  if (!ReadableStream2.from) {
    ReadableStream2.from = function (iterable) {
      const iterator = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]()
      return new ReadableStream2({
        async pull(controller) {
          const result = await iterator.next()
          if (result.done) {
            controller.close()
            return
          }
          controller.enqueue(result.value)
        },
        async cancel(reason) {
          await iterator.return?.(reason)
        },
      })
    }
  }
  if (!ReadableStream2.prototype[Symbol.asyncIterator] || !ReadableStream2.prototype.values) {
    ReadableStream2.prototype.values = async function* (options) {
      const reader = this.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            return
          }
          yield value
        }
      }
      finally {
        if (!options?.preventCancel) {
          await reader.cancel()
        }
        reader.releaseLock()
      }
    }
    ReadableStream2.prototype[Symbol.asyncIterator] // eslint-disable-next-line @typescript-eslint/unbound-method
      = ReadableStream2.prototype.values
  }
  return ReadableStream2
})()
const { WritableStream, TransformStream } = globalThis

// node_modules/@yume-chan/stream-extra/esm/push-readable.js
const PushReadableStream = class extends ReadableStream {
  /**
   * Create a new `PushReadableStream` from a source.
   *
   * @param source If `source` returns a `Promise`, the stream will be closed
   * when the `Promise` is resolved, and be errored when the `Promise` is rejected.
   * @param strategy
   */
  constructor(source, strategy, logger) {
    let waterMarkLow
    let zeroHighWaterMarkAllowEnqueue = false
    const abortController = new AbortController()
    super({
      start: (controller) => {
        const result = source({
          abortSignal: abortController.signal,
          enqueue: async (chunk) => {
            logger?.({
              source: 'producer',
              operation: 'enqueue',
              value: chunk,
              phase: 'start',
            })
            if (abortController.signal.aborted) {
              logger?.({
                source: 'producer',
                operation: 'enqueue',
                value: chunk,
                phase: 'ignored',
              })
              return
            }
            if (controller.desiredSize === null) {
              controller.enqueue(chunk)
              return
            }
            if (zeroHighWaterMarkAllowEnqueue) {
              zeroHighWaterMarkAllowEnqueue = false
              controller.enqueue(chunk)
              logger?.({
                source: 'producer',
                operation: 'enqueue',
                value: chunk,
                phase: 'complete',
              })
              return
            }
            if (controller.desiredSize <= 0) {
              logger?.({
                source: 'producer',
                operation: 'enqueue',
                value: chunk,
                phase: 'waiting',
              })
              waterMarkLow = new PromiseResolver()
              await waterMarkLow.promise
              if (abortController.signal.aborted) {
                logger?.({
                  source: 'producer',
                  operation: 'enqueue',
                  value: chunk,
                  phase: 'ignored',
                })
                return
              }
            }
            controller.enqueue(chunk)
            logger?.({
              source: 'producer',
              operation: 'enqueue',
              value: chunk,
              phase: 'complete',
            })
          },
          close() {
            logger?.({
              source: 'producer',
              operation: 'close',
              explicit: true,
              phase: 'start',
            })
            if (abortController.signal.aborted) {
              logger?.({
                source: 'producer',
                operation: 'close',
                explicit: true,
                phase: 'ignored',
              })
              return
            }
            controller.close()
            logger?.({
              source: 'producer',
              operation: 'close',
              explicit: true,
              phase: 'complete',
            })
          },
          error(e) {
            logger?.({
              source: 'producer',
              operation: 'error',
              explicit: true,
              phase: 'start',
            })
            controller.error(e)
            logger?.({
              source: 'producer',
              operation: 'error',
              explicit: true,
              phase: 'complete',
            })
          },
        })
        if (result && 'then' in result) {
          result.then(() => {
            logger?.({
              source: 'producer',
              operation: 'close',
              explicit: false,
              phase: 'start',
            })
            try {
              controller.close()
              logger?.({
                source: 'producer',
                operation: 'close',
                explicit: false,
                phase: 'complete',
              })
            }
            catch {
              logger?.({
                source: 'producer',
                operation: 'close',
                explicit: false,
                phase: 'ignored',
              })
            }
          }, (e) => {
            logger?.({
              source: 'producer',
              operation: 'error',
              explicit: false,
              phase: 'start',
            })
            controller.error(e)
            logger?.({
              source: 'producer',
              operation: 'error',
              explicit: false,
              phase: 'complete',
            })
          })
        }
      },
      pull: () => {
        logger?.({
          source: 'consumer',
          operation: 'pull',
          phase: 'start',
        })
        if (waterMarkLow) {
          waterMarkLow.resolve()
        }
        else if (strategy?.highWaterMark === 0) {
          zeroHighWaterMarkAllowEnqueue = true
        }
        logger?.({
          source: 'consumer',
          operation: 'pull',
          phase: 'complete',
        })
      },
      cancel: (reason) => {
        logger?.({
          source: 'consumer',
          operation: 'cancel',
          phase: 'start',
        })
        abortController.abort(reason)
        waterMarkLow?.resolve()
        logger?.({
          source: 'consumer',
          operation: 'cancel',
          phase: 'complete',
        })
      },
    }, strategy)
  }
}

// node_modules/@yume-chan/stream-extra/esm/try-close.js
function tryClose(controller) {
  try {
    controller.close()
    return true
  }
  catch {
    return false
  }
}
async function tryCancel(stream) {
  try {
    await stream.cancel()
    return true
  }
  catch {
    return false
  }
}

// node_modules/@yume-chan/stream-extra/esm/buffered.js
const BufferedReadableStream = class {
  #buffered
  // PERF: `subarray` is slow
  // don't use it until absolutely necessary
  #bufferedOffset = 0
  #bufferedLength = 0
  #position = 0
  get position() {
    return this.#position
  }

  stream
  reader
  constructor(stream) {
    this.stream = stream
    this.reader = stream.getReader()
  }

  #readBuffered(length) {
    if (!this.#buffered) {
      return void 0
    }
    const value = this.#buffered.subarray(this.#bufferedOffset, this.#bufferedOffset + length)
    if (this.#bufferedLength > length) {
      this.#position += length
      this.#bufferedOffset += length
      this.#bufferedLength -= length
      return value
    }
    this.#position += this.#bufferedLength
    this.#buffered = void 0
    this.#bufferedOffset = 0
    this.#bufferedLength = 0
    return value
  }

  async #readSource(length) {
    const { done, value } = await this.reader.read()
    if (done) {
      throw new ExactReadableEndedError()
    }
    if (value.length > length) {
      this.#buffered = value
      this.#bufferedOffset = length
      this.#bufferedLength = value.length - length
      this.#position += length
      return value.subarray(0, length)
    }
    this.#position += value.length
    return value
  }

  iterateExactly(length) {
    let state = this.#buffered ? 0 : 1
    return {
      next: () => {
        switch (state) {
          case 0: {
            const value = this.#readBuffered(length)
            if (value.length === length) {
              state = 2
            }
            else {
              length -= value.length
              state = 1
            }
            return { done: false, value }
          }
          case 1:
            state = 3
            return {
              done: false,
              value: this.#readSource(length).then((value) => {
                if (value.length === length) {
                  state = 2
                }
                else {
                  length -= value.length
                  state = 1
                }
                return value
              }),
            }
          case 2:
            return { done: true, value: void 0 }
          case 3:
            throw new Error('Can\'t call `next` before previous Promise resolves')
          default:
            throw new Error('unreachable')
        }
      },
    }
  }

  readExactly = bipedal(function* (then, length) {
    let result
    let index = 0
    const initial = this.#readBuffered(length)
    if (initial) {
      if (initial.length === length) {
        return initial
      }
      result = new Uint8Array(length)
      result.set(initial, index)
      index += initial.length
      length -= initial.length
    }
    else {
      result = new Uint8Array(length)
    }
    while (length > 0) {
      const value = yield* then(this.#readSource(length))
      result.set(value, index)
      index += value.length
      length -= value.length
    }
    return result
  })

  /**
   * Return a readable stream with unconsumed data (if any) and
   * all data from the wrapped stream.
   * @returns A `ReadableStream`
   */
  release() {
    if (this.#bufferedLength > 0) {
      return new PushReadableStream(async (controller) => {
        const buffered = this.#buffered.subarray(this.#bufferedOffset)
        await controller.enqueue(buffered)
        controller.abortSignal.addEventListener('abort', () => {
          void tryCancel(this.reader)
        })
        while (true) {
          const { done, value } = await this.reader.read()
          if (done) {
            return
          }
          await controller.enqueue(value)
        }
      })
    }
    else {
      this.reader.releaseLock()
      return this.stream
    }
  }

  async cancel(reason) {
    await this.reader.cancel(reason)
  }
}

// node_modules/@yume-chan/stream-extra/esm/buffered-transform.js
const BufferedTransformStream = class {
  #readable
  get readable() {
    return this.#readable
  }

  #writable
  get writable() {
    return this.#writable
  }

  constructor(transform) {
    let bufferedStreamController
    let writableStreamController
    const buffered = new BufferedReadableStream(new PushReadableStream((controller) => {
      bufferedStreamController = controller
    }))
    this.#readable = new ReadableStream({
      async pull(controller) {
        try {
          const value = await transform(buffered)
          controller.enqueue(value)
        }
        catch (e) {
          if (e instanceof StructEmptyError) {
            controller.close()
            return
          }
          throw e
        }
      },
      cancel: (reason) => {
        return writableStreamController.error(reason)
      },
    })
    this.#writable = new WritableStream({
      start(controller) {
        writableStreamController = controller
      },
      async write(chunk) {
        await bufferedStreamController.enqueue(chunk)
      },
      abort() {
        bufferedStreamController.close()
      },
      close() {
        bufferedStreamController.close()
      },
    })
  }
}

// node_modules/@yume-chan/stream-extra/esm/concat.js
const ConcatStringStream = class {
  // PERF: rope (concat strings) is faster than `[].join('')`
  #result = ''
  #resolver = new PromiseResolver()
  #writable = new WritableStream({
    write: (chunk) => {
      this.#result += chunk
    },
    close: () => {
      this.#resolver.resolve(this.#result)
      this.#readableController.enqueue(this.#result)
      this.#readableController.close()
    },
    abort: (reason) => {
      this.#resolver.reject(reason)
      this.#readableController.error(reason)
    },
  })

  get writable() {
    return this.#writable
  }

  #readableController
  #readable = new ReadableStream({
    start: (controller) => {
      this.#readableController = controller
    },
  })

  get readable() {
    return this.#readable
  }

  constructor() {
    void Object.defineProperties(this.#readable, {
      then: {
        get: () => this.#resolver.promise.then.bind(this.#resolver.promise),
      },
      catch: {
        get: () => this.#resolver.promise.catch.bind(this.#resolver.promise),
      },
      finally: {
        get: () => this.#resolver.promise.finally.bind(this.#resolver.promise),
      },
    })
  }
}
const ConcatBufferStream = class {
  #segments = []
  #resolver = new PromiseResolver()
  #writable = new WritableStream({
    write: (chunk) => {
      this.#segments.push(chunk)
    },
    close: () => {
      let result
      let offset = 0
      switch (this.#segments.length) {
        case 0:
          result = EmptyUint8Array
          break
        case 1:
          result = this.#segments[0]
          break
        default:
          result = new Uint8Array(this.#segments.reduce((prev, item) => prev + item.length, 0))
          for (const segment of this.#segments) {
            result.set(segment, offset)
            offset += segment.length
          }
          break
      }
      this.#resolver.resolve(result)
      this.#readableController.enqueue(result)
      this.#readableController.close()
    },
    abort: (reason) => {
      this.#resolver.reject(reason)
      this.#readableController.error(reason)
    },
  })

  get writable() {
    return this.#writable
  }

  #readableController
  #readable = new ReadableStream({
    start: (controller) => {
      this.#readableController = controller
    },
  })

  get readable() {
    return this.#readable
  }

  constructor() {
    void Object.defineProperties(this.#readable, {
      then: {
        get: () => this.#resolver.promise.then.bind(this.#resolver.promise),
      },
      catch: {
        get: () => this.#resolver.promise.catch.bind(this.#resolver.promise),
      },
      finally: {
        get: () => this.#resolver.promise.finally.bind(this.#resolver.promise),
      },
    })
  }
}

// node_modules/@yume-chan/stream-extra/esm/consumable/readable.js
const ConsumableReadableStream = class _ConsumableReadableStream extends ReadableStream {
  static async enqueue(controller, chunk) {
    const output = new Consumable(chunk)
    controller.enqueue(output)
    await output.consumed
  }

  constructor(source, strategy) {
    let wrappedController
    let wrappedStrategy
    if (strategy) {
      wrappedStrategy = {}
      if ('highWaterMark' in strategy) {
        wrappedStrategy.highWaterMark = strategy.highWaterMark
      }
      if ('size' in strategy) {
        wrappedStrategy.size = (chunk) => {
          return strategy.size(chunk.value)
        }
      }
    }
    super({
      start(controller) {
        wrappedController = {
          enqueue(chunk) {
            return _ConsumableReadableStream.enqueue(controller, chunk)
          },
          close() {
            controller.close()
          },
          error(reason) {
            controller.error(reason)
          },
        }
        return source.start?.(wrappedController)
      },
      pull() {
        return source.pull?.(wrappedController)
      },
      cancel(reason) {
        return source.cancel?.(reason)
      },
    }, wrappedStrategy)
  }
}

// node_modules/@yume-chan/stream-extra/esm/consumable/wrap-byte-readable.js
const ConsumableWrapByteReadableStream = class extends ReadableStream {
  constructor(stream, chunkSize, min) {
    const reader = stream.getReader({ mode: 'byob' })
    let array = new Uint8Array(chunkSize)
    super({
      async pull(controller) {
        const { done, value } = await reader.read(array, { min })
        if (done) {
          controller.close()
          return
        }
        await ConsumableReadableStream.enqueue(controller, value)
        array = new Uint8Array(value.buffer)
      },
      cancel(reason) {
        return reader.cancel(reason)
      },
    })
  }
}

// node_modules/@yume-chan/stream-extra/esm/consumable/wrap-writable.js
const ConsumableWrapWritableStream = class extends WritableStream {
  constructor(stream) {
    const writer = stream.getWriter()
    super({
      write(chunk) {
        return chunk.tryConsume(chunk2 => writer.write(chunk2))
      },
      abort(reason) {
        return writer.abort(reason)
      },
      close() {
        return writer.close()
      },
    })
  }
}

// node_modules/@yume-chan/stream-extra/esm/consumable/writable.js
const ConsumableWritableStream = class extends WritableStream {
  static async write(writer, value) {
    const consumable = new Consumable(value)
    await writer.write(consumable)
    await consumable.consumed
  }

  constructor(sink, strategy) {
    let wrappedStrategy
    if (strategy) {
      wrappedStrategy = {}
      if ('highWaterMark' in strategy) {
        wrappedStrategy.highWaterMark = strategy.highWaterMark
      }
      if ('size' in strategy) {
        wrappedStrategy.size = (chunk) => {
          return strategy.size(chunk instanceof Consumable ? chunk.value : chunk)
        }
      }
    }
    super({
      start(controller) {
        return sink.start?.(controller)
      },
      write(chunk, controller) {
        return chunk.tryConsume(chunk2 => sink.write?.(chunk2, controller))
      },
      abort(reason) {
        return sink.abort?.(reason)
      },
      close() {
        return sink.close?.()
      },
    }, wrappedStrategy)
  }
}

// node_modules/@yume-chan/stream-extra/esm/task.js
const { console } = globalThis
const createTask = /* @__PURE__ */ (() => console?.createTask?.bind(console) ?? (() => ({
  run(callback) {
    return callback()
  },
})))()

// node_modules/@yume-chan/stream-extra/esm/consumable.js
var Consumable = class {
  static WritableStream = ConsumableWritableStream
  static WrapWritableStream = ConsumableWrapWritableStream
  static ReadableStream = ConsumableReadableStream
  static WrapByteReadableStream = ConsumableWrapByteReadableStream
  #task
  #resolver
  value
  consumed
  constructor(value) {
    this.#task = createTask('Consumable')
    this.value = value
    this.#resolver = new PromiseResolver()
    this.consumed = this.#resolver.promise
  }

  consume() {
    this.#resolver.resolve()
  }

  error(error) {
    this.#resolver.reject(error)
  }

  tryConsume(callback) {
    try {
      let result = this.#task.run(() => callback(this.value))
      if (isPromiseLike(result)) {
        result = result.then((value) => {
          this.#resolver.resolve()
          return value
        }, (e) => {
          this.#resolver.reject(e)
          throw e
        })
      }
      else {
        this.#resolver.resolve()
      }
      return result
    }
    catch (e) {
      this.#resolver.reject(e)
      throw e
    }
  }
}

// node_modules/@yume-chan/stream-extra/esm/maybe-consumable/index.js
const maybe_consumable_exports = {}
__export(maybe_consumable_exports, {
  WrapWritableStream: () => MaybeConsumableWrapWritableStream,
  WritableStream: () => MaybeConsumableWritableStream,
  getValue: () => getValue,
  tryConsume: () => tryConsume,
})

// node_modules/@yume-chan/stream-extra/esm/maybe-consumable/utils.js
function getValue(value) {
  return value instanceof Consumable ? value.value : value
}
function tryConsume(value, callback) {
  if (value instanceof Consumable) {
    return value.tryConsume(callback)
  }
  else {
    return callback(value)
  }
}

// node_modules/@yume-chan/stream-extra/esm/maybe-consumable/wrap-writable.js
var MaybeConsumableWrapWritableStream = class extends WritableStream {
  constructor(stream) {
    const writer = stream.getWriter()
    super({
      write(chunk) {
        return tryConsume(chunk, chunk2 => writer.write(chunk2))
      },
      abort(reason) {
        return writer.abort(reason)
      },
      close() {
        return writer.close()
      },
    })
  }
}

// node_modules/@yume-chan/stream-extra/esm/maybe-consumable/writable.js
var MaybeConsumableWritableStream = class extends WritableStream {
  constructor(sink, strategy) {
    let wrappedStrategy
    if (strategy) {
      wrappedStrategy = {}
      if ('highWaterMark' in strategy) {
        wrappedStrategy.highWaterMark = strategy.highWaterMark
      }
      if ('size' in strategy) {
        wrappedStrategy.size = (chunk) => {
          return strategy.size(chunk instanceof Consumable ? chunk.value : chunk)
        }
      }
    }
    super({
      start(controller) {
        return sink.start?.(controller)
      },
      write(chunk, controller) {
        return tryConsume(chunk, chunk2 => sink.write?.(chunk2, controller))
      },
      abort(reason) {
        return sink.abort?.(reason)
      },
      close() {
        return sink.close?.()
      },
    }, wrappedStrategy)
  }
}

// node_modules/@yume-chan/stream-extra/esm/distribution.js
const BufferCombiner = class {
  #capacity
  #buffer
  #offset
  #available
  constructor(size) {
    this.#capacity = size
    this.#buffer = new Uint8Array(size)
    this.#offset = 0
    this.#available = size
  }

  /**
   * Pushes data to the combiner.
   * @param data The input data to be split or combined.
   * @returns
   * A generator that yields buffers of specified size.
   * It may yield the same buffer multiple times, consume the data before calling `next`.
   */
  * push(data) {
    let offset = 0
    let available = data.length
    if (this.#offset !== 0) {
      if (available >= this.#available) {
        this.#buffer.set(data.subarray(0, this.#available), this.#offset)
        offset += this.#available
        available -= this.#available
        yield this.#buffer
        this.#offset = 0
        this.#available = this.#capacity
        if (available === 0) {
          return
        }
      }
      else {
        this.#buffer.set(data, this.#offset)
        this.#offset += available
        this.#available -= available
        return
      }
    }
    while (available >= this.#capacity) {
      const end = offset + this.#capacity
      yield data.subarray(offset, end)
      offset = end
      available -= this.#capacity
    }
    if (available > 0) {
      this.#buffer.set(data.subarray(offset), this.#offset)
      this.#offset += available
      this.#available -= available
    }
  }

  flush() {
    if (this.#offset === 0) {
      return void 0
    }
    const output = this.#buffer.subarray(0, this.#offset)
    this.#offset = 0
    this.#available = this.#capacity
    return output
  }
}
const DistributionStream = class extends TransformStream {
  constructor(size, combine = false) {
    const combiner = combine ? new BufferCombiner(size) : void 0
    super({
      async transform(chunk, controller) {
        await maybe_consumable_exports.tryConsume(chunk, async (chunk2) => {
          if (combiner) {
            for (const buffer2 of combiner.push(chunk2)) {
              await Consumable.ReadableStream.enqueue(controller, buffer2)
            }
          }
          else {
            let offset = 0
            let available = chunk2.length
            while (available > 0) {
              const end = offset + size
              await Consumable.ReadableStream.enqueue(controller, chunk2.subarray(offset, end))
              offset = end
              available -= size
            }
          }
        })
      },
      flush(controller) {
        if (combiner) {
          const data = combiner.flush()
          if (data) {
            controller.enqueue(data)
          }
        }
      },
    })
  }
}

// node_modules/@yume-chan/stream-extra/esm/wrap-readable.js
function getWrappedReadableStream(wrapper, controller) {
  if ('start' in wrapper) {
    return wrapper.start(controller)
  }
  else if (typeof wrapper === 'function') {
    return wrapper(controller)
  }
  else {
    return wrapper
  }
}
const WrapReadableStream = class extends ReadableStream {
  readable
  #reader
  constructor(wrapper, strategy) {
    super({
      start: async (controller) => {
        const readable = await getWrappedReadableStream(wrapper, controller)
        this.readable = readable
        this.#reader = this.readable.getReader()
      },
      pull: async (controller) => {
        const { done, value } = await this.#reader.read().catch((e) => {
          if ('error' in wrapper) {
            wrapper.error(e)
          }
          throw e
        })
        if (done) {
          controller.close()
          if ('close' in wrapper) {
            await wrapper.close?.()
          }
        }
        else {
          controller.enqueue(value)
        }
      },
      cancel: async (reason) => {
        await this.#reader.cancel(reason)
        if ('cancel' in wrapper) {
          await wrapper.cancel?.(reason)
        }
      },
    }, strategy)
  }
}

// node_modules/@yume-chan/stream-extra/esm/duplex.js
function NOOP () {
}
const DuplexStreamFactory = class {
  #readableControllers = []
  #writers = []
  #writableClosed = false
  get writableClosed() {
    return this.#writableClosed
  }

  #closed = new PromiseResolver()
  get closed() {
    return this.#closed.promise
  }

  #options
  constructor(options) {
    this.#options = options ?? {}
  }

  wrapReadable(readable, strategy) {
    return new WrapReadableStream({
      start: (controller) => {
        this.#readableControllers.push(controller)
        return readable
      },
      cancel: async () => {
        await this.close()
      },
      close: async () => {
        await this.dispose()
      },
    }, strategy)
  }

  createWritable(stream) {
    const writer = stream.getWriter()
    this.#writers.push(writer)
    return new WritableStream({
      write: async (chunk) => {
        await writer.write(chunk)
      },
      abort: async (reason) => {
        await writer.abort(reason)
        await this.close()
      },
      close: async () => {
        await writer.close().catch(NOOP)
        await this.close()
      },
    })
  }

  async close() {
    if (this.#writableClosed) {
      return
    }
    this.#writableClosed = true
    if (await this.#options.close?.() !== false) {
      await this.dispose()
    }
    for (const writer of this.#writers) {
      writer.close().catch(NOOP)
    }
  }

  async dispose() {
    this.#writableClosed = true
    this.#closed.resolve()
    for (const controller of this.#readableControllers) {
      tryClose(controller)
    }
    await this.#options.dispose?.()
  }
}

// node_modules/@yume-chan/stream-extra/esm/encoding.js
const Global = globalThis
const TextDecoderStream = Global.TextDecoderStream
const TextEncoderStream = Global.TextEncoderStream

// node_modules/@yume-chan/stream-extra/esm/pipe-from.js
function pipeFrom(writable, pair) {
  const writer = pair.writable.getWriter()
  const pipe = pair.readable.pipeTo(writable)
  return new WritableStream({
    async write(chunk) {
      await writer.write(chunk)
    },
    async close() {
      await writer.close()
      await pipe
    },
  })
}

// node_modules/@yume-chan/stream-extra/esm/struct-deserialize.js
const StructDeserializeStream = class extends BufferedTransformStream {
  constructor(struct2) {
    super((stream) => {
      return struct2.deserialize(stream)
    })
  }
}

// node_modules/@yume-chan/event/esm/disposable.js
const AutoDisposable = class {
  #disposables = []
  constructor() {
    this.dispose = this.dispose.bind(this)
  }

  addDisposable(disposable) {
    this.#disposables.push(disposable)
    return disposable
  }

  dispose() {
    for (const disposable of this.#disposables) {
      disposable.dispose()
    }
    this.#disposables = []
  }
}

// node_modules/@yume-chan/event/esm/event-emitter.js
const EventEmitter = class {
  listeners = []
  constructor() {
    this.event = this.event.bind(this)
  }

  addEventListener(info) {
    this.listeners.push(info)
    const remove = () => {
      const index = this.listeners.indexOf(info)
      if (index !== -1) {
        this.listeners.splice(index, 1)
      }
    }
    remove.dispose = remove
    return remove
  }

  event = (listener, thisArg, ...args) => {
    const info = {
      listener,
      thisArg,
      args,
    }
    return this.addEventListener(info)
  }

  fire(e) {
    for (const info of this.listeners.slice()) {
      info.listener.call(info.thisArg, e, ...info.args)
    }
  }

  dispose() {
    this.listeners.length = 0
  }
}

// node_modules/@yume-chan/event/esm/sticky-event-emitter.js
const Undefined = /* @__PURE__ */ Symbol('undefined')
const StickyEventEmitter = class extends EventEmitter {
  #value = Undefined
  addEventListener(info) {
    if (this.#value !== Undefined) {
      info.listener.call(info.thisArg, this.#value, ...info.args)
    }
    return super.addEventListener(info)
  }

  fire(e) {
    this.#value = e
    super.fire(e)
  }
}

// node_modules/@yume-chan/adb/esm/commands/base.js
const AdbServiceBase = class extends AutoDisposable {
  #adb
  get adb() {
    return this.#adb
  }

  constructor(adb) {
    super()
    this.#adb = adb
  }
}

// node_modules/@yume-chan/adb/esm/commands/framebuffer.js
const Version = struct({ version: u32 }, { littleEndian: true })
const AdbFrameBufferV1 = struct({
  bpp: u32,
  size: u32,
  width: u32,
  height: u32,
  red_offset: u32,
  red_length: u32,
  blue_offset: u32,
  blue_length: u32,
  green_offset: u32,
  green_length: u32,
  alpha_offset: u32,
  alpha_length: u32,
  data: buffer('size'),
}, { littleEndian: true })
const AdbFrameBufferV2 = struct({
  bpp: u32,
  colorSpace: u32,
  size: u32,
  width: u32,
  height: u32,
  red_offset: u32,
  red_length: u32,
  blue_offset: u32,
  blue_length: u32,
  green_offset: u32,
  green_length: u32,
  alpha_offset: u32,
  alpha_length: u32,
  data: buffer('size'),
}, { littleEndian: true })
const AdbFrameBufferError = class extends Error {
  constructor(message, options) {
    super(message, options)
  }
}
const AdbFrameBufferUnsupportedVersionError = class extends AdbFrameBufferError {
  constructor(version) {
    super(`Unsupported FrameBuffer version ${version}`)
  }
}
const AdbFrameBufferForbiddenError = class extends AdbFrameBufferError {
  constructor() {
    super('FrameBuffer is disabled by current app')
  }
}
async function framebuffer(adb) {
  const socket = await adb.createSocket('framebuffer:')
  const stream = new BufferedReadableStream(socket.readable)
  let version
  try {
    ({ version } = await Version.deserialize(stream))
  }
  catch (e) {
    if (e instanceof StructEmptyError) {
      throw new AdbFrameBufferForbiddenError()
    }
    throw e
  }
  switch (version) {
    case 1:
      return await AdbFrameBufferV1.deserialize(stream)
    case 2:
      return await AdbFrameBufferV2.deserialize(stream)
    default:
      throw new AdbFrameBufferUnsupportedVersionError(version)
  }
}

// node_modules/@yume-chan/adb/esm/commands/power.js
const AdbPower = class extends AdbServiceBase {
  reboot(mode = '') {
    return this.adb.createSocketAndWait(`reboot:${mode}`)
  }

  bootloader() {
    return this.reboot('bootloader')
  }

  fastboot() {
    return this.reboot('fastboot')
  }

  recovery() {
    return this.reboot('recovery')
  }

  sideload() {
    return this.reboot('sideload')
  }

  /**
   * Reboot to Qualcomm Emergency Download (EDL) Mode.
   *
   * Only works on some Qualcomm devices.
   */
  qualcommEdlMode() {
    return this.reboot('edl')
  }

  powerOff() {
    return this.adb.subprocess.noneProtocol.spawnWaitText(['reboot', '-p'])
  }

  powerButton(longPress = false) {
    const args = ['input', 'keyevent']
    if (longPress) {
      args.push('--longpress')
    }
    args.push('POWER')
    return this.adb.subprocess.noneProtocol.spawnWaitText(args)
  }

  /**
   * Reboot to Samsung Odin download mode.
   *
   * Only works on Samsung devices.
   */
  samsungOdin() {
    return this.reboot('download')
  }
}

// node_modules/@yume-chan/adb/esm/utils/array-buffer.js
function toLocalUint8Array(value) {
  if (value.buffer instanceof ArrayBuffer) {
    return value
  }
  const copy = new Uint8Array(value.length)
  copy.set(value)
  return copy
}

// node_modules/@yume-chan/adb/esm/utils/auto-reset-event.js
const AutoResetEvent = class {
  #set
  #queue = []
  constructor(initialSet = false) {
    this.#set = initialSet
  }

  wait() {
    if (!this.#set) {
      this.#set = true
      if (this.#queue.length === 0) {
        return Promise.resolve()
      }
    }
    const resolver = new PromiseResolver()
    this.#queue.push(resolver)
    return resolver.promise
  }

  notifyOne() {
    if (this.#queue.length !== 0) {
      this.#queue.pop().resolve()
    }
    else {
      this.#set = false
    }
  }

  dispose() {
    for (const item of this.#queue) {
      item.reject(new Error('The AutoResetEvent has been disposed'))
    }
    this.#queue.length = 0
  }
}

// node_modules/@yume-chan/adb/esm/utils/base64.js
const [charToIndex, indexToChar, paddingChar] = /* @__PURE__ */ (() => {
  const charToIndex2 = []
  const indexToChar2 = []
  const paddingChar2 = '='.charCodeAt(0)
  function addRange(start, end) {
    const charCodeStart = start.charCodeAt(0)
    const charCodeEnd = end.charCodeAt(0)
    for (let charCode = charCodeStart; charCode <= charCodeEnd; charCode += 1) {
      charToIndex2[charCode] = indexToChar2.length
      indexToChar2.push(charCode)
    }
  }
  addRange('A', 'Z')
  addRange('a', 'z')
  addRange('0', '9')
  addRange('+', '+')
  addRange('/', '/')
  return [charToIndex2, indexToChar2, paddingChar2]
})()
function calculateBase64EncodedLength(inputLength) {
  const remainder = inputLength % 3
  const paddingLength = remainder !== 0 ? 3 - remainder : 0
  return [(inputLength + paddingLength) / 3 * 4, paddingLength]
}
function encodeBase64(input, output) {
  const [outputLength, paddingLength] = calculateBase64EncodedLength(input.length)
  if (!output) {
    output = new Uint8Array(outputLength)
    encodeForward(input, output, paddingLength)
    return output
  }
  else {
    if (output.length < outputLength) {
      throw new TypeError('output buffer is too small')
    }
    output = output.subarray(0, outputLength)
    if (input.buffer !== output.buffer) {
      encodeForward(input, output, paddingLength)
    }
    else if (output.byteOffset + output.length - (paddingLength + 1) <= input.byteOffset + input.length) {
      encodeForward(input, output, paddingLength)
    }
    else if (output.byteOffset >= input.byteOffset - 1) {
      encodeBackward(input, output, paddingLength)
    }
    else {
      throw new TypeError('input and output cannot overlap')
    }
    return outputLength
  }
}
function encodeForward(input, output, paddingLength) {
  let inputIndex = 0
  let outputIndex = 0
  while (inputIndex < input.length - 2) {
    const x = input[inputIndex]
    inputIndex += 1
    const y = input[inputIndex]
    inputIndex += 1
    const z = input[inputIndex]
    inputIndex += 1
    output[outputIndex] = indexToChar[x >> 2]
    outputIndex += 1
    output[outputIndex] = indexToChar[(x & 3) << 4 | y >> 4]
    outputIndex += 1
    output[outputIndex] = indexToChar[(y & 15) << 2 | z >> 6]
    outputIndex += 1
    output[outputIndex] = indexToChar[z & 63]
    outputIndex += 1
  }
  if (paddingLength === 2) {
    const x = input[inputIndex]
    inputIndex += 1
    output[outputIndex] = indexToChar[x >> 2]
    outputIndex += 1
    output[outputIndex] = indexToChar[(x & 3) << 4]
    outputIndex += 1
    output[outputIndex] = paddingChar
    outputIndex += 1
    output[outputIndex] = paddingChar
  }
  else if (paddingLength === 1) {
    const x = input[inputIndex]
    inputIndex += 1
    const y = input[inputIndex]
    inputIndex += 1
    output[outputIndex] = indexToChar[x >> 2]
    outputIndex += 1
    output[outputIndex] = indexToChar[(x & 3) << 4 | y >> 4]
    outputIndex += 1
    output[outputIndex] = indexToChar[(y & 15) << 2]
    outputIndex += 1
    output[outputIndex] = paddingChar
  }
}
function encodeBackward(input, output, paddingLength) {
  let inputIndex = input.length - 1
  let outputIndex = output.length - 1
  if (paddingLength === 2) {
    const x = input[inputIndex]
    inputIndex -= 1
    output[outputIndex] = paddingChar
    outputIndex -= 1
    output[outputIndex] = paddingChar
    outputIndex -= 1
    output[outputIndex] = indexToChar[(x & 3) << 4]
    outputIndex -= 1
    output[outputIndex] = indexToChar[x >> 2]
    outputIndex -= 1
  }
  else if (paddingLength === 1) {
    const y = input[inputIndex]
    inputIndex -= 1
    const x = input[inputIndex]
    inputIndex -= 1
    output[outputIndex] = paddingChar
    outputIndex -= 1
    output[outputIndex] = indexToChar[(y & 15) << 2]
    outputIndex -= 1
    output[outputIndex] = indexToChar[(x & 3) << 4 | y >> 4]
    outputIndex -= 1
    output[outputIndex] = indexToChar[x >> 2]
    outputIndex -= 1
  }
  while (inputIndex >= 0) {
    const z = input[inputIndex]
    inputIndex -= 1
    const y = input[inputIndex]
    inputIndex -= 1
    const x = input[inputIndex]
    inputIndex -= 1
    output[outputIndex] = indexToChar[z & 63]
    outputIndex -= 1
    output[outputIndex] = indexToChar[(y & 15) << 2 | z >> 6]
    outputIndex -= 1
    output[outputIndex] = indexToChar[(x & 3) << 4 | y >> 4]
    outputIndex -= 1
    output[outputIndex] = indexToChar[x >> 2]
    outputIndex -= 1
  }
}

// node_modules/@yume-chan/adb/esm/utils/hex.js
function hexCharToNumber(char) {
  if (char < 48) {
    throw new TypeError(`Invalid hex char ${char}`)
  }
  if (char < 58) {
    return char - 48
  }
  if (char < 65) {
    throw new TypeError(`Invalid hex char ${char}`)
  }
  if (char < 71) {
    return char - 55
  }
  if (char < 97) {
    throw new TypeError(`Invalid hex char ${char}`)
  }
  if (char < 103) {
    return char - 87
  }
  throw new TypeError(`Invalid hex char ${char}`)
}
function hexToNumber(data) {
  let result = 0
  for (let i = 0; i < data.length; i += 1) {
    result = result << 4 | hexCharToNumber(data[i])
  }
  return result
}

// node_modules/@yume-chan/adb/esm/utils/no-op.js
function NOOP2() {
}
function unreachable(...args) {
  throw new Error(`Unreachable. Arguments:\n${args.join('\n')}`)
}

// node_modules/@yume-chan/adb/esm/utils/sequence-equal.js
function sequenceEqual(a, b) {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

// node_modules/@yume-chan/adb/esm/commands/reverse.js
const AdbReverseStringResponse = struct({
  length: string(4),
  content: string({
    field: 'length',
    convert(value) {
      return Number.parseInt(value, 16)
    },
    back(value) {
      return value.toString(16).padStart(4, '0')
    },
  }),
}, { littleEndian: true })
const AdbReverseError = class extends Error {
  constructor(message) {
    super(message)
  }
}
const AdbReverseNotSupportedError = class extends AdbReverseError {
  constructor() {
    super('ADB reverse tunnel is not supported on this device when connected wirelessly.')
  }
}
const AdbReverseErrorResponse = extend(AdbReverseStringResponse, {}, {
  postDeserialize(value) {
    if (value.content === 'more than one device/emulator') {
      throw new AdbReverseNotSupportedError()
    }
    else {
      throw new AdbReverseError(value.content)
    }
  },
})
function decimalToNumber(buffer2) {
  let value = 0
  for (const byte of buffer2) {
    if (byte < 48 || byte > 57) {
      return value
    }
    value = value * 10 + byte - 48
  }
  return value
}
const OKAY = encodeUtf8('OKAY')
const AdbReverseService = class extends AdbServiceBase {
  #deviceAddressToLocalAddress = /* @__PURE__ */ new Map()
  async createBufferedStream(service) {
    const socket = await this.adb.createSocket(service)
    return new BufferedReadableStream(socket.readable)
  }

  async sendRequest(service) {
    const stream = await this.createBufferedStream(service)
    const response = await stream.readExactly(4)
    if (!sequenceEqual(response, OKAY)) {
      await AdbReverseErrorResponse.deserialize(stream)
    }
    return stream
  }

  /**
   * Get a list of all reverse port forwarding on the device.
   */
  async list() {
    const stream = await this.createBufferedStream('reverse:list-forward')
    const response = await AdbReverseStringResponse.deserialize(stream)
    return response.content.split('\n').filter(line => !!line).map((line) => {
      const [deviceSerial, localName, remoteName] = line.split(' ')
      return { deviceSerial, localName, remoteName }
    })
  }

  /**
   * Add a reverse port forwarding for a program that already listens on a port.
   */
  async addExternal(deviceAddress, localAddress) {
    const stream = await this.sendRequest(`reverse:forward:${deviceAddress};${localAddress}`)
    if (deviceAddress.startsWith('tcp:')) {
      const position = stream.position
      try {
        const length = hexToNumber(await stream.readExactly(4))
        const port = decimalToNumber(await stream.readExactly(length))
        deviceAddress = `tcp:${port}`
      }
      catch (e) {
        if (e instanceof ExactReadableEndedError && stream.position === position) {
        }
        else {
          throw e
        }
      }
    }
    return deviceAddress
  }

  /**
   * Add a reverse port forwarding.
   */
  async add(deviceAddress, handler, localAddress) {
    localAddress = await this.adb.transport.addReverseTunnel(handler, localAddress)
    try {
      deviceAddress = await this.addExternal(deviceAddress, localAddress)
      this.#deviceAddressToLocalAddress.set(deviceAddress, localAddress)
      return deviceAddress
    }
    catch (e) {
      await this.adb.transport.removeReverseTunnel(localAddress)
      throw e
    }
  }

  /**
   * Remove a reverse port forwarding.
   */
  async remove(deviceAddress) {
    const localAddress = this.#deviceAddressToLocalAddress.get(deviceAddress)
    if (localAddress) {
      await this.adb.transport.removeReverseTunnel(localAddress)
    }
    await this.sendRequest(`reverse:killforward:${deviceAddress}`)
  }

  /**
   * Remove all reverse port forwarding, including the ones added by other programs.
   */
  async removeAll() {
    await this.adb.transport.clearReverseTunnels()
    this.#deviceAddressToLocalAddress.clear()
    await this.sendRequest(`reverse:killforward-all`)
  }
}

// node_modules/@yume-chan/adb/esm/commands/subprocess/none/process.js
const AdbNoneProtocolProcessImpl = class {
  #socket
  get stdin() {
    return this.#socket.writable
  }

  get output() {
    return this.#socket.readable
  }

  #exited
  get exited() {
    return this.#exited
  }

  constructor(socket, signal) {
    this.#socket = socket
    if (signal) {
      const exited = new PromiseResolver()
      this.#socket.closed.then(() => exited.resolve(void 0), e => exited.reject(e))
      signal.addEventListener('abort', () => {
        exited.reject(signal.reason)
        this.#socket.close()
      })
      this.#exited = exited.promise
    }
    else {
      this.#exited = this.#socket.closed
    }
  }

  kill() {
    return this.#socket.close()
  }
}

// node_modules/@yume-chan/adb/esm/commands/subprocess/none/pty.js
const AdbNoneProtocolPtyProcess = class {
  #socket
  #writer
  #input
  get input() {
    return this.#input
  }

  get output() {
    return this.#socket.readable
  }

  get exited() {
    return this.#socket.closed
  }

  constructor(socket) {
    this.#socket = socket
    this.#writer = this.#socket.writable.getWriter()
    this.#input = new maybe_consumable_exports.WritableStream({
      write: chunk => this.#writer.write(chunk),
    })
  }

  sigint() {
    return this.#writer.write(new Uint8Array([3]))
  }

  kill() {
    return this.#socket.close()
  }
}

// node_modules/@yume-chan/adb/esm/commands/subprocess/utils.js
function escapeArg(s) {
  let result = ''
  result += `'`
  let base = 0
  while (true) {
    const found = s.indexOf(`'`, base)
    if (found === -1) {
      result += s.substring(base)
      break
    }
    result += s.substring(base, found)
    result += String.raw`'\''`
    base = found + 1
  }
  result += `'`
  return result
}
function splitCommand(command) {
  const result = []
  let quote
  let isEscaped = false
  let start = 0
  for (let i = 0, len = command.length; i < len; i += 1) {
    if (isEscaped) {
      isEscaped = false
      continue
    }
    const char = command.charAt(i)
    switch (char) {
      case ' ':
        if (!quote && i !== start) {
          result.push(command.substring(start, i))
          start = i + 1
        }
        break
      case '\'':
      case '"':
        if (!quote) {
          quote = char
        }
        else if (char === quote) {
          quote = void 0
        }
        break
      case '\\':
        isEscaped = true
        break
    }
  }
  if (start < command.length) {
    result.push(command.substring(start))
  }
  return result
}

// node_modules/@yume-chan/adb/esm/commands/subprocess/none/spawner.js
const AdbNoneProtocolSpawner = class {
  #spawn
  constructor(spawn) {
    this.#spawn = spawn
  }

  spawn(command, signal) {
    signal?.throwIfAborted()
    if (typeof command === 'string') {
      command = splitCommand(command)
    }
    return this.#spawn(command, signal)
  }

  async spawnWait(command) {
    const process = await this.spawn(command)
    return await process.output.pipeThrough(new ConcatBufferStream())
  }

  async spawnWaitText(command) {
    const process = await this.spawn(command)
    return await process.output.pipeThrough(new TextDecoderStream()).pipeThrough(new ConcatStringStream())
  }
}

// node_modules/@yume-chan/adb/esm/commands/subprocess/none/service.js
const AdbNoneProtocolSubprocessService = class extends AdbNoneProtocolSpawner {
  #adb
  get adb() {
    return this.#adb
  }

  constructor(adb) {
    super(async (command, signal) => {
      const socket = await this.#adb.createSocket(`exec:${command.join(' ')}`)
      if (signal?.aborted) {
        await socket.close()
        throw signal.reason
      }
      return new AdbNoneProtocolProcessImpl(socket, signal)
    })
    this.#adb = adb
  }

  async pty(command) {
    if (command === void 0) {
      command = ''
    }
    else if (Array.isArray(command)) {
      command = command.join(' ')
    }
    return new AdbNoneProtocolPtyProcess(
      // https://github.com/microsoft/typescript/issues/17002
      await this.#adb.createSocket(`shell:${command}`),
    )
  }
}

// node_modules/@yume-chan/adb/esm/features.js
const AdbFeature = {
  ShellV2: 'shell_v2',
  Cmd: 'cmd',
  StatV2: 'stat_v2',
  ListV2: 'ls_v2',
  FixedPushMkdir: 'fixed_push_mkdir',
  Abb: 'abb',
  AbbExec: 'abb_exec',
  SendReceiveV2: 'sendrecv_v2',
  DelayedAck: 'delayed_ack',
}

// node_modules/@yume-chan/adb/esm/commands/subprocess/shell/shared.js
const AdbShellProtocolId = {
  Stdin: 0,
  Stdout: 1,
  Stderr: 2,
  Exit: 3,
  CloseStdin: 4,
  WindowSizeChange: 5,
}
const AdbShellProtocolPacket = struct({
  id: u8(),
  data: buffer(u32),
}, { littleEndian: true })

// node_modules/@yume-chan/adb/esm/commands/subprocess/shell/process.js
const AdbShellProtocolProcessImpl = class {
  #socket
  #writer
  #stdin
  get stdin() {
    return this.#stdin
  }

  #stdout
  get stdout() {
    return this.#stdout
  }

  #stderr
  get stderr() {
    return this.#stderr
  }

  #exited
  get exited() {
    return this.#exited
  }

  constructor(socket, signal) {
    this.#socket = socket
    let stdoutController
    let stderrController
    this.#stdout = new PushReadableStream((controller) => {
      stdoutController = controller
    })
    this.#stderr = new PushReadableStream((controller) => {
      stderrController = controller
    })
    const exited = new PromiseResolver()
    this.#exited = exited.promise
    socket.readable.pipeThrough(new StructDeserializeStream(AdbShellProtocolPacket)).pipeTo(new WritableStream({
      write: async (chunk) => {
        switch (chunk.id) {
          case AdbShellProtocolId.Exit:
            exited.resolve(chunk.data[0])
            break
          case AdbShellProtocolId.Stdout:
            await stdoutController.enqueue(chunk.data)
            break
          case AdbShellProtocolId.Stderr:
            await stderrController.enqueue(chunk.data)
            break
          default:
            break
        }
      },
    })).then(() => {
      stdoutController.close()
      stderrController.close()
      exited.reject(new Error('Socket ended without exit message'))
    }, (e) => {
      stdoutController.error(e)
      stderrController.error(e)
      exited.reject(e)
    })
    if (signal) {
      signal.addEventListener('abort', () => {
        exited.reject(signal.reason)
        this.#socket.close()
      })
    }
    this.#writer = this.#socket.writable.getWriter()
    this.#stdin = new maybe_consumable_exports.WritableStream({
      write: async (chunk) => {
        await this.#writer.write(AdbShellProtocolPacket.serialize({
          id: AdbShellProtocolId.Stdin,
          data: chunk,
        }))
      },
      close: () => (
        // Only shell protocol + raw mode supports closing stdin
        this.#writer.write(AdbShellProtocolPacket.serialize({
          id: AdbShellProtocolId.CloseStdin,
          data: EmptyUint8Array,
        }))
      ),
    })
  }

  kill() {
    return this.#socket.close()
  }
}

// node_modules/@yume-chan/adb/esm/commands/subprocess/shell/pty.js
const AdbShellProtocolPtyProcess = class {
  #socket
  #writer
  #input
  get input() {
    return this.#input
  }

  #stdout
  get output() {
    return this.#stdout
  }

  #exited = new PromiseResolver()
  get exited() {
    return this.#exited.promise
  }

  constructor(socket) {
    this.#socket = socket
    let stdoutController
    this.#stdout = new PushReadableStream((controller) => {
      stdoutController = controller
    })
    socket.readable.pipeThrough(new StructDeserializeStream(AdbShellProtocolPacket)).pipeTo(new WritableStream({
      write: async (chunk) => {
        switch (chunk.id) {
          case AdbShellProtocolId.Exit:
            this.#exited.resolve(chunk.data[0])
            break
          case AdbShellProtocolId.Stdout:
            await stdoutController.enqueue(chunk.data)
            break
        }
      },
    })).then(() => {
      stdoutController.close()
      this.#exited.reject(new Error('Socket ended without exit message'))
    }, (e) => {
      stdoutController.error(e)
      this.#exited.reject(e)
    })
    this.#writer = this.#socket.writable.getWriter()
    this.#input = new maybe_consumable_exports.WritableStream({
      write: chunk => this.#writeStdin(chunk),
    })
  }

  #writeStdin(chunk) {
    return this.#writer.write(AdbShellProtocolPacket.serialize({
      id: AdbShellProtocolId.Stdin,
      data: chunk,
    }))
  }

  async resize(rows, cols) {
    await this.#writer.write(AdbShellProtocolPacket.serialize({
      id: AdbShellProtocolId.WindowSizeChange,
      // The "correct" format is `${rows}x${cols},${x_pixels}x${y_pixels}`
      // However, according to https://linux.die.net/man/4/tty_ioctl
      // `x_pixels` and `y_pixels` are unused, so always sending `0` should be fine.
      data: encodeUtf8(`${rows}x${cols},0x0\0`),
    }))
  }

  sigint() {
    return this.#writeStdin(new Uint8Array([3]))
  }

  kill() {
    return this.#socket.close()
  }
}

// node_modules/@yume-chan/adb/esm/commands/subprocess/shell/spawner.js
const AdbShellProtocolSpawner = class {
  #spawn
  constructor(spawn) {
    this.#spawn = spawn
  }

  spawn(command, signal) {
    signal?.throwIfAborted()
    if (typeof command === 'string') {
      command = splitCommand(command)
    }
    return this.#spawn(command, signal)
  }

  async spawnWait(command) {
    const process = await this.spawn(command)
    const [stdout, stderr, exitCode] = await Promise.all([
      process.stdout.pipeThrough(new ConcatBufferStream()),
      process.stderr.pipeThrough(new ConcatBufferStream()),
      process.exited,
    ])
    return { stdout, stderr, exitCode }
  }

  async spawnWaitText(command) {
    const process = await this.spawn(command)
    const [stdout, stderr, exitCode] = await Promise.all([
      process.stdout.pipeThrough(new TextDecoderStream()).pipeThrough(new ConcatStringStream()),
      process.stderr.pipeThrough(new TextDecoderStream()).pipeThrough(new ConcatStringStream()),
      process.exited,
    ])
    return { stdout, stderr, exitCode }
  }
}

// node_modules/@yume-chan/adb/esm/commands/subprocess/shell/service.js
const AdbShellProtocolSubprocessService = class extends AdbShellProtocolSpawner {
  #adb
  get adb() {
    return this.#adb
  }

  get isSupported() {
    return this.#adb.canUseFeature(AdbFeature.ShellV2)
  }

  constructor(adb) {
    super(async (command, signal) => {
      const socket = await this.#adb.createSocket(`shell,v2,raw:${command.join(' ')}`)
      if (signal?.aborted) {
        await socket.close()
        throw signal.reason
      }
      return new AdbShellProtocolProcessImpl(socket, signal)
    })
    this.#adb = adb
  }

  async pty(options) {
    let service = 'shell,v2,pty'
    if (options?.terminalType) {
      service += `,TERM=${options.terminalType}`
    }
    service += ':'
    if (options) {
      if (typeof options.command === 'string') {
        service += options.command
      }
      else if (Array.isArray(options.command)) {
        service += options.command.join(' ')
      }
    }
    return new AdbShellProtocolPtyProcess(await this.#adb.createSocket(service))
  }
}

// node_modules/@yume-chan/adb/esm/commands/subprocess/service.js
const AdbSubprocessService = class {
  #adb
  get adb() {
    return this.#adb
  }

  #noneProtocol
  get noneProtocol() {
    return this.#noneProtocol
  }

  #shellProtocol
  get shellProtocol() {
    return this.#shellProtocol
  }

  constructor(adb) {
    this.#adb = adb
    this.#noneProtocol = new AdbNoneProtocolSubprocessService(adb)
    if (adb.canUseFeature(AdbFeature.ShellV2)) {
      this.#shellProtocol = new AdbShellProtocolSubprocessService(adb)
    }
  }
}

// node_modules/@yume-chan/adb/esm/commands/sync/response.js
function encodeAsciiUnchecked(value) {
  const result = new Uint8Array(value.length)
  for (let i = 0; i < value.length; i += 1) {
    result[i] = value.charCodeAt(i)
  }
  return result
}
// @__NO_SIDE_EFFECTS__
function adbSyncEncodeId(value) {
  const buffer2 = encodeAsciiUnchecked(value)
  return getUint32LittleEndian(buffer2, 0)
}
const AdbSyncResponseId = {
  Entry: /* @__PURE__ */ adbSyncEncodeId('DENT'),
  Entry2: /* @__PURE__ */ adbSyncEncodeId('DNT2'),
  Lstat: /* @__PURE__ */ adbSyncEncodeId('STAT'),
  Stat: /* @__PURE__ */ adbSyncEncodeId('STA2'),
  Lstat2: /* @__PURE__ */ adbSyncEncodeId('LST2'),
  Done: /* @__PURE__ */ adbSyncEncodeId('DONE'),
  Data: /* @__PURE__ */ adbSyncEncodeId('DATA'),
  Ok: /* @__PURE__ */ adbSyncEncodeId('OKAY'),
  Fail: /* @__PURE__ */ adbSyncEncodeId('FAIL'),
}
const AdbSyncError = class extends Error {
}
const AdbSyncFailResponse = struct({ message: string(u32) }, {
  littleEndian: true,
  postDeserialize(value) {
    throw new AdbSyncError(value.message)
  },
})
async function adbSyncReadResponse(stream, id, type) {
  if (typeof id === 'string') {
    id = /* @__PURE__ */ adbSyncEncodeId(id)
  }
  const buffer2 = await stream.readExactly(4)
  switch (getUint32LittleEndian(buffer2, 0)) {
    case AdbSyncResponseId.Fail:
      await AdbSyncFailResponse.deserialize(stream)
      throw new Error('Unreachable')
    case id:
      return await type.deserialize(stream)
    default:
      throw new Error(`Expected '${id}', but got '${decodeUtf8(buffer2)}'`)
  }
}
async function* adbSyncReadResponses(stream, id, type) {
  if (typeof id === 'string') {
    id = /* @__PURE__ */ adbSyncEncodeId(id)
  }
  while (true) {
    const buffer2 = await stream.readExactly(4)
    switch (getUint32LittleEndian(buffer2, 0)) {
      case AdbSyncResponseId.Fail:
        await AdbSyncFailResponse.deserialize(stream)
        unreachable()
      case AdbSyncResponseId.Done:
        await stream.readExactly(type.size)
        return
      case id:
        yield await type.deserialize(stream)
        break
      default:
        throw new Error(`Expected '${id}' or '${AdbSyncResponseId.Done}', but got '${decodeUtf8(buffer2)}'`)
    }
  }
}

// node_modules/@yume-chan/adb/esm/commands/sync/request.js
const AdbSyncRequestId = {
  List: adbSyncEncodeId('LIST'),
  ListV2: adbSyncEncodeId('LIS2'),
  Send: adbSyncEncodeId('SEND'),
  SendV2: adbSyncEncodeId('SND2'),
  Lstat: adbSyncEncodeId('STAT'),
  Stat: adbSyncEncodeId('STA2'),
  LstatV2: adbSyncEncodeId('LST2'),
  Data: adbSyncEncodeId('DATA'),
  Done: adbSyncEncodeId('DONE'),
  Receive: adbSyncEncodeId('RECV'),
}
const AdbSyncNumberRequest = struct({ id: u32, arg: u32 }, { littleEndian: true })
async function adbSyncWriteRequest(writable, id, value) {
  if (typeof id === 'string') {
    id = adbSyncEncodeId(id)
  }
  if (typeof value === 'number') {
    await writable.write(AdbSyncNumberRequest.serialize({ id, arg: value }))
    return
  }
  if (typeof value === 'string') {
    value = encodeUtf8(value)
  }
  await writable.write(AdbSyncNumberRequest.serialize({ id, arg: value.length }))
  await writable.write(value)
}

// node_modules/@yume-chan/adb/esm/commands/sync/stat.js
const LinuxFileType = {
  Directory: 4,
  File: 8,
  Link: 10,
}
const AdbSyncLstatResponse = struct({ mode: u32, size: u32, mtime: u32 }, {
  littleEndian: true,
  extra: {
    get type() {
      return this.mode >> 12
    },
    get permission() {
      return this.mode & 4095
    },
  },
  postDeserialize(value) {
    if (value.mode === 0 && value.size === 0 && value.mtime === 0) {
      throw new Error('lstat error')
    }
    return value
  },
})
const AdbSyncStatErrorCode = {
  SUCCESS: 0,
  EACCES: 13,
  EEXIST: 17,
  EFAULT: 14,
  EFBIG: 27,
  EINTR: 4,
  EINVAL: 22,
  EIO: 5,
  EISDIR: 21,
  ELOOP: 40,
  EMFILE: 24,
  ENAMETOOLONG: 36,
  ENFILE: 23,
  ENOENT: 2,
  ENOMEM: 12,
  ENOSPC: 28,
  ENOTDIR: 20,
  EOVERFLOW: 75,
  EPERM: 1,
  EROFS: 30,
  ETXTBSY: 26,
}
const AdbSyncStatErrorName = /* @__PURE__ */ (() => Object.fromEntries(Object.entries(AdbSyncStatErrorCode).map(([key, value]) => [
  value,
  key,
])))()
const AdbSyncStatResponse = struct({
  error: u32(),
  dev: u64,
  ino: u64,
  mode: u32,
  nlink: u32,
  uid: u32,
  gid: u32,
  size: u64,
  atime: u64,
  mtime: u64,
  ctime: u64,
}, {
  littleEndian: true,
  extra: {
    get type() {
      return this.mode >> 12
    },
    get permission() {
      return this.mode & 4095
    },
  },
  postDeserialize(value) {
    if (value.error) {
      throw new Error(AdbSyncStatErrorName[value.error])
    }
    return value
  },
})
async function adbSyncLstat(socket, path, v2) {
  const locked = await socket.lock()
  try {
    if (v2) {
      await adbSyncWriteRequest(locked, AdbSyncRequestId.LstatV2, path)
      return await adbSyncReadResponse(locked, AdbSyncResponseId.Lstat2, AdbSyncStatResponse)
    }
    else {
      await adbSyncWriteRequest(locked, AdbSyncRequestId.Lstat, path)
      const response = await adbSyncReadResponse(locked, AdbSyncResponseId.Lstat, AdbSyncLstatResponse)
      return {
        mode: response.mode,
        // Convert to `BigInt` to make it compatible with `AdbSyncStatResponse`
        size: BigInt(response.size),
        mtime: BigInt(response.mtime),
        get type() {
          return response.type
        },
        get permission() {
          return response.permission
        },
      }
    }
  }
  finally {
    locked.release()
  }
}
async function adbSyncStat(socket, path) {
  const locked = await socket.lock()
  try {
    await adbSyncWriteRequest(locked, AdbSyncRequestId.Stat, path)
    return await adbSyncReadResponse(locked, AdbSyncResponseId.Stat, AdbSyncStatResponse)
  }
  finally {
    locked.release()
  }
}

// node_modules/@yume-chan/adb/esm/commands/sync/list.js
const AdbSyncEntryResponse = extend(AdbSyncLstatResponse, {
  name: string(u32),
})
const AdbSyncEntry2Response = extend(AdbSyncStatResponse, {
  name: string(u32),
})
async function* adbSyncOpenDirV2(socket, path) {
  const locked = await socket.lock()
  try {
    await adbSyncWriteRequest(locked, AdbSyncRequestId.ListV2, path)
    for await (const item of adbSyncReadResponses(locked, AdbSyncResponseId.Entry2, AdbSyncEntry2Response)) {
      if (item.error !== AdbSyncStatErrorCode.SUCCESS) {
        continue
      }
      yield item
    }
  }
  finally {
    locked.release()
  }
}
async function* adbSyncOpenDirV1(socket, path) {
  const locked = await socket.lock()
  try {
    await adbSyncWriteRequest(locked, AdbSyncRequestId.List, path)
    for await (const item of adbSyncReadResponses(locked, AdbSyncResponseId.Entry, AdbSyncEntryResponse)) {
      yield item
    }
  }
  finally {
    locked.release()
  }
}
async function* adbSyncOpenDir(socket, path, v2) {
  if (v2) {
    yield* adbSyncOpenDirV2(socket, path)
  }
  else {
    for await (const item of adbSyncOpenDirV1(socket, path)) {
      yield {
        mode: item.mode,
        size: BigInt(item.size),
        mtime: BigInt(item.mtime),
        get type() {
          return item.type
        },
        get permission() {
          return item.permission
        },
        name: item.name,
      }
    }
  }
}

// node_modules/@yume-chan/adb/esm/commands/sync/pull.js
const AdbSyncDataResponse = struct({ data: buffer(u32) }, { littleEndian: true })
async function* adbSyncPullGenerator(socket, path) {
  const locked = await socket.lock()
  let done = false
  try {
    await adbSyncWriteRequest(locked, AdbSyncRequestId.Receive, path)
    for await (const packet of adbSyncReadResponses(locked, AdbSyncResponseId.Data, AdbSyncDataResponse)) {
      yield packet.data
    }
    done = true
  }
  catch (e) {
    done = true
    throw e
  }
  finally {
    if (!done) {
      for await (const packet of adbSyncReadResponses(locked, AdbSyncResponseId.Data, AdbSyncDataResponse)) {
        void packet
      }
    }
    locked.release()
  }
}
function adbSyncPull(socket, path) {
  return ReadableStream.from(adbSyncPullGenerator(socket, path))
}

// node_modules/@yume-chan/adb/esm/commands/sync/push.js
const ADB_SYNC_MAX_PACKET_SIZE = 64 * 1024
const AdbSyncOkResponse = struct({ unused: u32 }, { littleEndian: true })
async function pipeFileData(locked, file, packetSize, mtime) {
  const abortController = new AbortController()
  file.pipeThrough(new DistributionStream(packetSize, true)).pipeTo(new maybe_consumable_exports.WritableStream({
    write(chunk) {
      return adbSyncWriteRequest(locked, AdbSyncRequestId.Data, chunk)
    },
  }), { signal: abortController.signal }).then(async () => {
    await adbSyncWriteRequest(locked, AdbSyncRequestId.Done, mtime)
    await locked.flush()
  }, NOOP2)
  await adbSyncReadResponse(locked, AdbSyncResponseId.Ok, AdbSyncOkResponse).catch((e) => {
    abortController.abort()
    throw e
  })
}
async function adbSyncPushV1({ socket, filename, file, type = LinuxFileType.File, permission = 438, mtime = Date.now() / 1e3 | 0, packetSize = ADB_SYNC_MAX_PACKET_SIZE }) {
  const locked = await socket.lock()
  try {
    const mode = type << 12 | permission
    const pathAndMode = `${filename},${mode.toString()}`
    await adbSyncWriteRequest(locked, AdbSyncRequestId.Send, pathAndMode)
    await pipeFileData(locked, file, packetSize, mtime)
  }
  finally {
    locked.release()
  }
}
const AdbSyncSendV2Flags = {
  None: 0,
  Brotli: 1,
  /**
   * 2
   */
  Lz4: 1 << 1,
  /**
   * 4
   */
  Zstd: 1 << 2,
  DryRun: 2147483648,
}
const AdbSyncSendV2Request = struct({ id: u32, mode: u32, flags: u32() }, { littleEndian: true })
async function adbSyncPushV2({ socket, filename, file, type = LinuxFileType.File, permission = 438, mtime = Date.now() / 1e3 | 0, packetSize = ADB_SYNC_MAX_PACKET_SIZE, dryRun = false }) {
  const locked = await socket.lock()
  try {
    await adbSyncWriteRequest(locked, AdbSyncRequestId.SendV2, filename)
    const mode = type << 12 | permission
    let flags = AdbSyncSendV2Flags.None
    if (dryRun) {
      flags |= AdbSyncSendV2Flags.DryRun
    }
    await locked.write(AdbSyncSendV2Request.serialize({
      id: AdbSyncRequestId.SendV2,
      mode,
      flags,
    }))
    await pipeFileData(locked, file, packetSize, mtime)
  }
  finally {
    locked.release()
  }
}
function adbSyncPush(options) {
  if (options.v2) {
    return adbSyncPushV2(options)
  }
  if (options.dryRun) {
    throw new Error('dryRun is not supported in v1')
  }
  return adbSyncPushV1(options)
}

// node_modules/@yume-chan/adb/esm/commands/sync/socket.js
const AdbSyncSocketLocked = class {
  #writer
  #readable
  #socketLock
  #writeLock = new AutoResetEvent()
  #combiner
  get position() {
    return this.#readable.position
  }

  constructor(writer, readable, bufferSize, lock) {
    this.#writer = writer
    this.#readable = readable
    this.#socketLock = lock
    this.#combiner = new BufferCombiner(bufferSize)
  }

  #write(buffer2) {
    return Consumable.WritableStream.write(this.#writer, buffer2)
  }

  async flush() {
    try {
      await this.#writeLock.wait()
      const buffer2 = this.#combiner.flush()
      if (buffer2) {
        await this.#write(buffer2)
      }
    }
    finally {
      this.#writeLock.notifyOne()
    }
  }

  async write(data) {
    try {
      await this.#writeLock.wait()
      for (const buffer2 of this.#combiner.push(data)) {
        await this.#write(buffer2)
      }
    }
    finally {
      this.#writeLock.notifyOne()
    }
  }

  async readExactly(length) {
    await this.flush()
    return await this.#readable.readExactly(length)
  }

  release() {
    this.#combiner.flush()
    this.#socketLock.notifyOne()
  }

  async close() {
    await this.#readable.cancel()
  }
}
const AdbSyncSocket = class {
  #lock = new AutoResetEvent()
  #socket
  #locked
  constructor(socket, bufferSize) {
    this.#socket = socket
    this.#locked = new AdbSyncSocketLocked(socket.writable.getWriter(), new BufferedReadableStream(socket.readable), bufferSize, this.#lock)
  }

  async lock() {
    await this.#lock.wait()
    return this.#locked
  }

  async close() {
    await this.#locked.close()
    await this.#socket.close()
  }
}

// node_modules/@yume-chan/adb/esm/commands/sync/sync.js
function dirname(path) {
  const end = path.lastIndexOf('/')
  if (end === -1) {
    throw new Error(`Invalid path`)
  }
  if (end === 0) {
    return '/'
  }
  return path.substring(0, end)
}
const AdbSync = class {
  _adb
  _socket
  #supportsStat
  #supportsListV2
  #fixedPushMkdir
  #supportsSendReceiveV2
  #needPushMkdirWorkaround
  get supportsStat() {
    return this.#supportsStat
  }

  get supportsListV2() {
    return this.#supportsListV2
  }

  get fixedPushMkdir() {
    return this.#fixedPushMkdir
  }

  get supportsSendReceiveV2() {
    return this.#supportsSendReceiveV2
  }

  get needPushMkdirWorkaround() {
    return this.#needPushMkdirWorkaround
  }

  constructor(adb, socket) {
    this._adb = adb
    this._socket = new AdbSyncSocket(socket, adb.maxPayloadSize)
    this.#supportsStat = adb.canUseFeature(AdbFeature.StatV2)
    this.#supportsListV2 = adb.canUseFeature(AdbFeature.ListV2)
    this.#fixedPushMkdir = adb.canUseFeature(AdbFeature.FixedPushMkdir)
    this.#supportsSendReceiveV2 = adb.canUseFeature(AdbFeature.SendReceiveV2)
    this.#needPushMkdirWorkaround = this._adb.canUseFeature(AdbFeature.ShellV2) && !this.fixedPushMkdir
  }

  /**
   * Gets information of a file or folder.
   *
   * If `path` points to a symbolic link, the returned information is about the link itself (with `type` being `LinuxFileType.Link`).
   */
  async lstat(path) {
    return await adbSyncLstat(this._socket, path, this.#supportsStat)
  }

  /**
   * Gets the information of a file or folder.
   *
   * If `path` points to a symbolic link, it will be resolved and the returned information is about the target (with `type` being `LinuxFileType.File` or `LinuxFileType.Directory`).
   */
  async stat(path) {
    if (!this.#supportsStat) {
      throw new Error('Not supported')
    }
    return await adbSyncStat(this._socket, path)
  }

  /**
   * Checks if `path` is a directory, or a symbolic link to a directory.
   *
   * This uses `lstat` internally, thus works on all Android versions.
   */
  async isDirectory(path) {
    try {
      await this.lstat(`${path}/`)
      return true
    }
    catch {
      return false
    }
  }

  opendir(path) {
    return adbSyncOpenDir(this._socket, path, this.supportsListV2)
  }

  async readdir(path) {
    const results = []
    for await (const entry of this.opendir(path)) {
      results.push(entry)
    }
    return results
  }

  /**
   * Reads the content of a file on device.
   *
   * @param filename The full path of the file on device to read.
   * @returns A `ReadableStream` that contains the file content.
   */
  read(filename) {
    return adbSyncPull(this._socket, filename)
  }

  /**
   * Writes a file on device. If the file name already exists, it will be overwritten.
   *
   * @param options The content and options of the file to write.
   */
  async write(options) {
    if (this.needPushMkdirWorkaround) {
      await this._adb.subprocess.noneProtocol.spawnWait([
        'mkdir',
        '-p',
        escapeArg(dirname(options.filename)),
      ])
    }
    await adbSyncPush({
      v2: this.supportsSendReceiveV2,
      socket: this._socket,
      ...options,
    })
  }

  lockSocket() {
    return this._socket.lock()
  }

  dispose() {
    return this._socket.close()
  }
}

// node_modules/@yume-chan/adb/esm/commands/tcpip.js
function parsePort(value) {
  if (!value || value === '0') {
    return void 0
  }
  return Number.parseInt(value, 10)
}
const AdbTcpIpService = class extends AdbServiceBase {
  async getListenAddresses() {
    const serviceListenAddresses = await this.adb.getProp('service.adb.listen_addrs')
    const servicePort = await this.adb.getProp('service.adb.tcp.port')
    const persistPort = await this.adb.getProp('persist.adb.tcp.port')
    return {
      serviceListenAddresses: serviceListenAddresses != '' ? serviceListenAddresses.split(',') : [],
      servicePort: parsePort(servicePort),
      persistPort: parsePort(persistPort),
    }
  }

  async setPort(port) {
    if (port <= 0) {
      throw new TypeError(`Invalid port ${port}`)
    }
    const output = await this.adb.createSocketAndWait(`tcpip:${port}`)
    if (output !== `restarting in TCP mode port: ${port}
`) {
      throw new Error(output)
    }
    return output
  }

  async disable() {
    const output = await this.adb.createSocketAndWait('usb:')
    if (output !== 'restarting in USB mode\n') {
      throw new Error(output)
    }
    return output
  }
}

// node_modules/@yume-chan/adb/esm/adb.js
const Adb = class {
  #transport
  get transport() {
    return this.#transport
  }

  get serial() {
    return this.#transport.serial
  }

  get maxPayloadSize() {
    return this.#transport.maxPayloadSize
  }

  get banner() {
    return this.#transport.banner
  }

  get disconnected() {
    return this.#transport.disconnected
  }

  get clientFeatures() {
    return this.#transport.clientFeatures
  }

  get deviceFeatures() {
    return this.banner.features
  }

  subprocess
  power
  reverse
  tcpip
  constructor(transport) {
    this.#transport = transport
    this.subprocess = new AdbSubprocessService(this)
    this.power = new AdbPower(this)
    this.reverse = new AdbReverseService(this)
    this.tcpip = new AdbTcpIpService(this)
  }

  canUseFeature(feature) {
    return this.clientFeatures.includes(feature) && this.deviceFeatures.includes(feature)
  }

  /**
   * Creates a new ADB Socket to the specified service or socket address.
   */
  async createSocket(service) {
    return this.#transport.connect(service)
  }

  async createSocketAndWait(service) {
    const socket = await this.createSocket(service)
    return await socket.readable.pipeThrough(new TextDecoderStream()).pipeThrough(new ConcatStringStream())
  }

  getProp(key) {
    return this.subprocess.noneProtocol.spawnWaitText(['getprop', key]).then(output => output.trim())
  }

  rm(filenames, options) {
    const args = ['rm']
    if (options?.recursive) {
      args.push('-r')
    }
    if (options?.force) {
      args.push('-f')
    }
    if (Array.isArray(filenames)) {
      for (const filename of filenames) {
        args.push(escapeArg(filename))
      }
    }
    else {
      args.push(escapeArg(filenames))
    }
    args.push('</dev/null')
    return this.subprocess.noneProtocol.spawnWaitText(args)
  }

  async sync() {
    const socket = await this.createSocket('sync:')
    return new AdbSync(this, socket)
  }

  async framebuffer() {
    return framebuffer(this)
  }

  async close() {
    await this.#transport.close()
  }
}

// node_modules/@yume-chan/adb/esm/banner.js
const AdbBannerKey = {
  Product: 'ro.product.name',
  Model: 'ro.product.model',
  Device: 'ro.product.device',
  Features: 'features',
}
const AdbBanner = class _AdbBanner {
  static parse(banner) {
    let product
    let model
    let device
    let features = []
    const pieces = banner.split('::')
    if (pieces.length > 1) {
      const props = pieces[1]
      for (const prop of props.split(';')) {
        if (!prop) {
          continue
        }
        const keyValue = prop.split('=')
        if (keyValue.length !== 2) {
          continue
        }
        const [key, value] = keyValue
        switch (key) {
          case AdbBannerKey.Product:
            product = value
            break
          case AdbBannerKey.Model:
            model = value
            break
          case AdbBannerKey.Device:
            device = value
            break
          case AdbBannerKey.Features:
            features = value.split(',')
            break
        }
      }
    }
    return new _AdbBanner(product, model, device, features)
  }

  #product
  get product() {
    return this.#product
  }

  #model
  get model() {
    return this.#model
  }

  #device
  get device() {
    return this.#device
  }

  #features = []
  get features() {
    return this.#features
  }

  constructor(product, model, device, features) {
    this.#product = product
    this.#model = model
    this.#device = device
    this.#features = features
  }
}

// node_modules/@yume-chan/adb/esm/daemon/crypto.js
function getBigUint(array, byteOffset, length) {
  let result = 0n
  for (let i = byteOffset; i < byteOffset + length; i += 8) {
    result <<= 64n
    const value = getUint64BigEndian(array, i)
    result |= value
  }
  return result
}
function setBigUint(array, byteOffset, length, value, littleEndian) {
  if (littleEndian) {
    while (value > 0n) {
      setInt64LittleEndian(array, byteOffset, value)
      byteOffset += 8
      value >>= 64n
    }
  }
  else {
    let position = byteOffset + length - 8
    while (value > 0n) {
      setInt64BigEndian(array, position, value)
      position -= 8
      value >>= 64n
    }
  }
}
const RsaPrivateKeyNOffset = 38
const RsaPrivateKeyNLength = 2048 / 8
const RsaPrivateKeyDOffset = 303
const RsaPrivateKeyDLength = 2048 / 8
function rsaParsePrivateKey(key) {
  const n = getBigUint(key, RsaPrivateKeyNOffset, RsaPrivateKeyNLength)
  const d = getBigUint(key, RsaPrivateKeyDOffset, RsaPrivateKeyDLength)
  return [n, d]
}
function nonNegativeMod(m, d) {
  const r = m % d
  if (r > 0) {
    return r
  }
  return r + (d > 0 ? d : -d)
}
function modInverse(a, m) {
  a = nonNegativeMod(a, m)
  if (!a || m < 2) {
    return Number.NaN
  }
  const s = []
  let b = m
  while (b) {
    [a, b] = [b, a % b]
    s.push({ a, b })
  }
  if (a !== 1) {
    return Number.NaN
  }
  let x = 1
  let y = 0
  for (let i = s.length - 2; i >= 0; i -= 1) {
    [x, y] = [y, x - y * Math.floor(s[i].a / s[i].b)]
  }
  return nonNegativeMod(y, m)
}
const ModulusLengthInBytes = 2048 / 8
const ModulusLengthInWords = ModulusLengthInBytes / 4
function adbGetPublicKeySize() {
  return 4 + 4 + ModulusLengthInBytes + ModulusLengthInBytes + 4
}
function adbGeneratePublicKey(privateKey, output) {
  let outputType
  const outputLength = adbGetPublicKeySize()
  if (!output) {
    output = new Uint8Array(outputLength)
    outputType = 'Uint8Array'
  }
  else {
    if (output.length < outputLength) {
      throw new TypeError('output buffer is too small')
    }
    outputType = 'number'
  }
  const outputView = new DataView(output.buffer, output.byteOffset, output.length)
  let outputOffset = 0
  outputView.setUint32(outputOffset, ModulusLengthInWords, true)
  outputOffset += 4
  const [n] = rsaParsePrivateKey(privateKey)
  const n0inv = -modInverse(Number(n % 2n ** 32n), 2 ** 32)
  outputView.setInt32(outputOffset, n0inv, true)
  outputOffset += 4
  setBigUint(output, outputOffset, ModulusLengthInBytes, n, true)
  outputOffset += ModulusLengthInBytes
  const rr = 2n ** 4096n % n
  setBigUint(output, outputOffset, ModulusLengthInBytes, rr, true)
  outputOffset += ModulusLengthInBytes
  outputView.setUint32(outputOffset, 65537, true)
  outputOffset += 4
  if (outputType === 'Uint8Array') {
    return output
  }
  else {
    return outputLength
  }
}
function powMod(base, exponent, modulus) {
  if (modulus === 1n) {
    return 0n
  }
  let r = 1n
  base = base % modulus
  while (exponent > 0n) {
    if (BigInt.asUintN(1, exponent) === 1n) {
      r = r * base % modulus
    }
    base = base * base % modulus
    exponent >>= 1n
  }
  return r
}
const SHA1_DIGEST_LENGTH = 20
const ASN1_SEQUENCE = 48
const ASN1_OCTET_STRING = 4
const ASN1_NULL = 5
const ASN1_OID = 6
const SHA1_DIGEST_INFO = new Uint8Array([
  ASN1_SEQUENCE,
  13 + SHA1_DIGEST_LENGTH,
  ASN1_SEQUENCE,
  9,
  // SHA-1 (1 3 14 3 2 26)
  ASN1_OID,
  5,
  1 * 40 + 3,
  14,
  3,
  2,
  26,
  ASN1_NULL,
  0,
  ASN1_OCTET_STRING,
  SHA1_DIGEST_LENGTH,
])
function rsaSign(privateKey, data) {
  const [n, d] = rsaParsePrivateKey(privateKey)
  const padded = new Uint8Array(256)
  let index = 0
  padded[index] = 0
  index += 1
  padded[index] = 1
  index += 1
  const fillLength = padded.length - SHA1_DIGEST_INFO.length - data.length - 1
  while (index < fillLength) {
    padded[index] = 255
    index += 1
  }
  padded[index] = 0
  index += 1
  padded.set(SHA1_DIGEST_INFO, index)
  index += SHA1_DIGEST_INFO.length
  padded.set(data, index)
  const signature = powMod(getBigUint(padded, 0, padded.length), d, n)
  setBigUint(padded, 0, padded.length, signature, false)
  return padded
}

// node_modules/@yume-chan/adb/esm/daemon/packet.js
const AdbCommand = {
  Auth: 1213486401,
  // 'AUTH'
  Close: 1163086915,
  // 'CLSE'
  Connect: 1314410051,
  // 'CNXN'
  Okay: 1497451343,
  // 'OKAY'
  Open: 1313165391,
  // 'OPEN'
  Write: 1163154007,
  // 'WRTE'
}
const AdbPacketHeader = struct({
  command: u32,
  arg0: u32,
  arg1: u32,
  payloadLength: u32,
  checksum: u32,
  magic: s32,
}, { littleEndian: true })
const AdbPacket = extend(AdbPacketHeader, {
  payload: buffer('payloadLength'),
})
function calculateChecksum(payload) {
  return payload.reduce((result, item) => result + item, 0)
}
const AdbPacketSerializeStream = class extends TransformStream {
  constructor() {
    const headerBuffer = new Uint8Array(AdbPacketHeader.size)
    super({
      transform: async (chunk, controller) => {
        await chunk.tryConsume(async (chunk2) => {
          const init = chunk2
          init.payloadLength = init.payload.length
          AdbPacketHeader.serialize(init, headerBuffer)
          await Consumable.ReadableStream.enqueue(controller, headerBuffer)
          if (init.payloadLength) {
            await Consumable.ReadableStream.enqueue(controller, init.payload)
          }
        })
      },
    })
  }
}

// node_modules/@yume-chan/adb/esm/daemon/auth.js
const AdbAuthType = {
  Token: 1,
  Signature: 2,
  PublicKey: 3,
}
async function* AdbSignatureAuthenticator (credentialStore, getNextRequest) {
  for await (const key of credentialStore.iterateKeys()) {
    const packet = await getNextRequest()
    if (packet.arg0 !== AdbAuthType.Token) {
      return
    }
    const signature = rsaSign(key.buffer, packet.payload)
    yield {
      command: AdbCommand.Auth,
      arg0: AdbAuthType.Signature,
      arg1: 0,
      payload: signature,
    }
  }
}
async function* AdbPublicKeyAuthenticator (credentialStore, getNextRequest) {
  const packet = await getNextRequest()
  if (packet.arg0 !== AdbAuthType.Token) {
    return
  }
  let privateKey
  for await (const key of credentialStore.iterateKeys()) {
    privateKey = key
    break
  }
  if (!privateKey) {
    privateKey = await credentialStore.generateKey()
  }
  const publicKeyLength = adbGetPublicKeySize()
  const [publicKeyBase64Length] = calculateBase64EncodedLength(publicKeyLength)
  const nameBuffer = privateKey.name?.length ? encodeUtf8(privateKey.name) : EmptyUint8Array
  const publicKeyBuffer = new Uint8Array(publicKeyBase64Length + (nameBuffer.length ? nameBuffer.length + 1 : 0) // Space character + name
    + 1)
  adbGeneratePublicKey(privateKey.buffer, publicKeyBuffer)
  encodeBase64(publicKeyBuffer.subarray(0, publicKeyLength), publicKeyBuffer)
  if (nameBuffer.length) {
    publicKeyBuffer[publicKeyBase64Length] = 32
    publicKeyBuffer.set(nameBuffer, publicKeyBase64Length + 1)
  }
  yield {
    command: AdbCommand.Auth,
    arg0: AdbAuthType.PublicKey,
    arg1: 0,
    payload: publicKeyBuffer,
  }
}
const ADB_DEFAULT_AUTHENTICATORS = [
  AdbSignatureAuthenticator,
  AdbPublicKeyAuthenticator,
]
const AdbAuthenticationProcessor = class {
  authenticators
  #credentialStore
  #pendingRequest = new PromiseResolver()
  #iterator
  constructor(authenticators, credentialStore) {
    this.authenticators = authenticators
    this.#credentialStore = credentialStore
  }

  #getNextRequest = () => {
    return this.#pendingRequest.promise
  }

  async* #invokeAuthenticator() {
    for (const authenticator of this.authenticators) {
      for await (const packet of authenticator(this.#credentialStore, this.#getNextRequest)) {
        this.#pendingRequest = new PromiseResolver()
        yield packet
      }
    }
  }

  async process(packet) {
    if (!this.#iterator) {
      this.#iterator = this.#invokeAuthenticator()
    }
    this.#pendingRequest.resolve(packet)
    const result = await this.#iterator.next()
    if (result.done) {
      throw new Error('No authenticator can handle the request')
    }
    return result.value
  }

  dispose() {
    void this.#iterator?.return?.()
  }
}

// node_modules/@yume-chan/adb/esm/daemon/socket.js
const AdbDaemonSocketController = class {
  #dispatcher
  localId
  remoteId
  localCreated
  service
  #readable
  #readableController
  get readable() {
    return this.#readable
  }

  #writableController
  writable
  #closed = false
  #closedPromise = new PromiseResolver()
  get closed() {
    return this.#closedPromise.promise
  }

  #socket
  get socket() {
    return this.#socket
  }

  #availableWriteBytesChanged
  /**
   * When delayed ack is disabled, returns `Infinity` if the socket is ready to write
   * (exactly one packet can be written no matter how large it is), or `-1` if the socket
   * is waiting for ack message.
   *
   * When delayed ack is enabled, returns a non-negative finite number indicates the number of
   * bytes that can be written to the socket before waiting for ack message.
   */
  #availableWriteBytes = 0
  constructor(options) {
    this.#dispatcher = options.dispatcher
    this.localId = options.localId
    this.remoteId = options.remoteId
    this.localCreated = options.localCreated
    this.service = options.service
    this.#readable = new PushReadableStream((controller) => {
      this.#readableController = controller
    })
    this.writable = new maybe_consumable_exports.WritableStream({
      start: (controller) => {
        this.#writableController = controller
        controller.signal.addEventListener('abort', () => {
          this.#availableWriteBytesChanged?.reject(controller.signal.reason)
        })
      },
      write: async (data) => {
        const size = data.length
        const chunkSize = this.#dispatcher.options.maxPayloadSize
        for (let start = 0, end = chunkSize; start < size; start = end, end += chunkSize) {
          const chunk = data.subarray(start, end)
          await this.#writeChunk(chunk)
        }
      },
    })
    this.#socket = new AdbDaemonSocket(this)
    this.#availableWriteBytes = options.availableWriteBytes
  }

  async #writeChunk(data) {
    const length = data.length
    while (this.#availableWriteBytes < length) {
      const resolver = new PromiseResolver()
      this.#availableWriteBytesChanged = resolver
      await resolver.promise
    }
    if (this.#availableWriteBytes === Infinity) {
      this.#availableWriteBytes = -1
    }
    else {
      this.#availableWriteBytes -= length
    }
    await this.#dispatcher.sendPacket(AdbCommand.Write, this.localId, this.remoteId, data)
  }

  async enqueue(data) {
    await this.#readableController.enqueue(data)
  }

  ack(bytes) {
    this.#availableWriteBytes += bytes
    this.#availableWriteBytesChanged?.resolve()
  }

  async close() {
    if (this.#closed) {
      return
    }
    this.#closed = true
    this.#availableWriteBytesChanged?.reject(new Error('Socket closed'))
    try {
      this.#writableController.error(new Error('Socket closed'))
    }
    catch {
    }
    await this.#dispatcher.sendPacket(AdbCommand.Close, this.localId, this.remoteId, EmptyUint8Array)
  }

  dispose() {
    this.#readableController.close()
    this.#closedPromise.resolve(void 0)
  }
}
var AdbDaemonSocket = class {
  #controller
  get localId() {
    return this.#controller.localId
  }

  get remoteId() {
    return this.#controller.remoteId
  }

  get localCreated() {
    return this.#controller.localCreated
  }

  get service() {
    return this.#controller.service
  }

  get readable() {
    return this.#controller.readable
  }

  get writable() {
    return this.#controller.writable
  }

  get closed() {
    return this.#controller.closed
  }

  constructor(controller) {
    this.#controller = controller
  }

  close() {
    return this.#controller.close()
  }
}

// node_modules/@yume-chan/adb/esm/daemon/dispatcher.js
const AdbPacketDispatcher = class {
  // ADB socket id starts from 1
  // (0 means open failed)
  #initializers = new AsyncOperationManager(1)
  /**
   * Socket local ID to the socket controller.
   */
  #sockets = /* @__PURE__ */ new Map()
  #writer
  options
  #closed = false
  #disconnected = new PromiseResolver()
  get disconnected() {
    return this.#disconnected.promise
  }

  #incomingSocketHandlers = /* @__PURE__ */ new Map()
  #readAbortController = new AbortController()
  constructor(connection, options) {
    this.options = options
    if (this.options.initialDelayedAckBytes < 0) {
      this.options.initialDelayedAckBytes = 0
    }
    connection.readable.pipeTo(new WritableStream({
      write: async (packet, controller) => {
        switch (packet.command) {
          case AdbCommand.Close:
            await this.#handleClose(packet)
            break
          case AdbCommand.Okay:
            this.#handleOkay(packet)
            break
          case AdbCommand.Open:
            await this.#handleOpen(packet)
            break
          case AdbCommand.Write:
            this.#handleWrite(packet).catch((e) => {
              controller.error(e)
            })
            break
          default:
            throw new Error(`Unknown command: ${packet.command.toString(16)}`)
        }
      },
    }), {
      preventCancel: options.preserveConnection ?? false,
      signal: this.#readAbortController.signal,
    }).then(() => {
      this.#dispose()
    }, (e) => {
      if (!this.#closed) {
        this.#disconnected.reject(e)
      }
      this.#dispose()
    })
    this.#writer = connection.writable.getWriter()
  }

  async #handleClose(packet) {
    if (packet.arg0 === 0 && this.#initializers.reject(packet.arg1, new Error('Socket open failed'))) {
      return
    }
    const socket = this.#sockets.get(packet.arg1)
    if (socket) {
      await socket.close()
      socket.dispose()
      this.#sockets.delete(packet.arg1)
    }
  }

  #handleOkay(packet) {
    let ackBytes
    if (this.options.initialDelayedAckBytes !== 0) {
      if (packet.payload.length !== 4) {
        throw new Error('Invalid OKAY packet. Payload size should be 4')
      }
      ackBytes = getUint32LittleEndian(packet.payload, 0)
    }
    else {
      if (packet.payload.length !== 0) {
        throw new Error('Invalid OKAY packet. Payload size should be 0')
      }
      ackBytes = Infinity
    }
    if (this.#initializers.resolve(packet.arg1, {
      remoteId: packet.arg0,
      availableWriteBytes: ackBytes,
    })) {
      return
    }
    const socket = this.#sockets.get(packet.arg1)
    if (socket) {
      socket.ack(ackBytes)
      return
    }
    void this.sendPacket(AdbCommand.Close, packet.arg1, packet.arg0, EmptyUint8Array)
  }

  #sendOkay(localId, remoteId, ackBytes) {
    let payload
    if (this.options.initialDelayedAckBytes !== 0) {
      payload = new Uint8Array(4)
      setUint32LittleEndian(payload, 0, ackBytes)
    }
    else {
      payload = EmptyUint8Array
    }
    return this.sendPacket(AdbCommand.Okay, localId, remoteId, payload)
  }

  async #handleOpen(packet) {
    const [localId] = this.#initializers.add()
    this.#initializers.resolve(localId, void 0)
    const remoteId = packet.arg0
    let availableWriteBytes = packet.arg1
    let service = decodeUtf8(packet.payload)
    if (service.endsWith('\0')) {
      service = service.substring(0, service.length - 1)
    }
    if (this.options.initialDelayedAckBytes === 0) {
      if (availableWriteBytes !== 0) {
        throw new Error('Invalid OPEN packet. arg1 should be 0')
      }
      availableWriteBytes = Infinity
    }
    else {
      if (availableWriteBytes === 0) {
        throw new Error('Invalid OPEN packet. arg1 should be greater than 0')
      }
    }
    const handler = this.#incomingSocketHandlers.get(service)
    if (!handler) {
      await this.sendPacket(AdbCommand.Close, 0, remoteId, EmptyUint8Array)
      return
    }
    const controller = new AdbDaemonSocketController({
      dispatcher: this,
      localId,
      remoteId,
      localCreated: false,
      service,
      availableWriteBytes,
    })
    try {
      await handler(controller.socket)
      this.#sockets.set(localId, controller)
      await this.#sendOkay(localId, remoteId, this.options.initialDelayedAckBytes)
    }
    catch {
      await this.sendPacket(AdbCommand.Close, 0, remoteId, EmptyUint8Array)
    }
  }

  async #handleWrite(packet) {
    const socket = this.#sockets.get(packet.arg1)
    if (!socket) {
      throw new Error(`Unknown local socket id: ${packet.arg1}`)
    }
    let handled = false
    const promises = [
      (async () => {
        await socket.enqueue(packet.payload)
        await this.#sendOkay(packet.arg1, packet.arg0, packet.payload.length)
        handled = true
      })(),
    ]
    if (this.options.readTimeLimit) {
      promises.push((async () => {
        await delay(this.options.readTimeLimit)
        if (!handled) {
          throw new Error(`readable of \`${socket.service}\` has stalled for ${this.options.readTimeLimit} milliseconds`)
        }
      })())
    }
    await Promise.race(promises)
  }

  async createSocket(service) {
    if (this.options.appendNullToServiceString) {
      service += '\0'
    }
    const [localId, initializer] = this.#initializers.add()
    await this.sendPacket(AdbCommand.Open, localId, this.options.initialDelayedAckBytes, service)
    const { remoteId, availableWriteBytes } = await initializer
    const controller = new AdbDaemonSocketController({
      dispatcher: this,
      localId,
      remoteId,
      localCreated: true,
      service,
      availableWriteBytes,
    })
    this.#sockets.set(localId, controller)
    return controller.socket
  }

  addReverseTunnel(service, handler) {
    this.#incomingSocketHandlers.set(service, handler)
  }

  removeReverseTunnel(address) {
    this.#incomingSocketHandlers.delete(address)
  }

  clearReverseTunnels() {
    this.#incomingSocketHandlers.clear()
  }

  async sendPacket(command, arg0, arg1, payload) {
    if (typeof payload === 'string') {
      payload = encodeUtf8(payload)
    }
    if (payload.length > this.options.maxPayloadSize) {
      throw new TypeError('payload too large')
    }
    await Consumable.WritableStream.write(this.#writer, {
      command,
      arg0,
      arg1,
      payload,
      checksum: this.options.calculateChecksum ? calculateChecksum(payload) : 0,
      magic: command ^ 4294967295,
    })
  }

  async close() {
    await Promise.all(Array.from(this.#sockets.values(), socket => socket.close()))
    this.#closed = true
    this.#readAbortController.abort()
    if (this.options.preserveConnection) {
      this.#writer.releaseLock()
    }
    else {
      await this.#writer.close()
    }
  }

  #dispose() {
    for (const socket of this.#sockets.values()) {
      socket.dispose()
    }
    this.#disconnected.resolve()
  }
}

// node_modules/@yume-chan/adb/esm/daemon/transport.js
const ADB_DAEMON_VERSION_OMIT_CHECKSUM = 16777217
const ADB_DAEMON_DEFAULT_FEATURES = /* @__PURE__ */ (() => [
  AdbFeature.ShellV2,
  AdbFeature.Cmd,
  AdbFeature.StatV2,
  AdbFeature.ListV2,
  AdbFeature.FixedPushMkdir,
  'apex',
  AdbFeature.Abb,
  // only tells the client the symlink timestamp issue in `adb push --sync` has been fixed.
  // No special handling required.
  'fixed_push_symlink_timestamp',
  AdbFeature.AbbExec,
  'remount_shell',
  'track_app',
  AdbFeature.SendReceiveV2,
  'sendrecv_v2_brotli',
  'sendrecv_v2_lz4',
  'sendrecv_v2_zstd',
  'sendrecv_v2_dry_run_send',
  AdbFeature.DelayedAck,
])()
const ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE = 32 * 1024 * 1024
const AdbDaemonTransport = class _AdbDaemonTransport {
  /**
   * Authenticate with the ADB Daemon and create a new transport.
   */
  static async authenticate({ serial, connection, credentialStore, authenticators = ADB_DEFAULT_AUTHENTICATORS, features = ADB_DAEMON_DEFAULT_FEATURES, initialDelayedAckBytes = ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE, ...options }) {
    let version = 16777217
    let maxPayloadSize = 1024 * 1024
    const resolver = new PromiseResolver()
    const authProcessor = new AdbAuthenticationProcessor(authenticators, credentialStore)
    const abortController = new AbortController()
    const pipe = connection.readable.pipeTo(new WritableStream({
      async write(packet) {
        switch (packet.command) {
          case AdbCommand.Connect:
            version = Math.min(version, packet.arg0)
            maxPayloadSize = Math.min(maxPayloadSize, packet.arg1)
            resolver.resolve(decodeUtf8(packet.payload))
            break
          case AdbCommand.Auth: {
            const response = await authProcessor.process(packet)
            await sendPacket(response)
            break
          }
          default:
            break
        }
      },
    }), {
      // Don't cancel the source ReadableStream on AbortSignal abort.
      preventCancel: true,
      signal: abortController.signal,
    }).then(() => {
      resolver.reject(new Error('Connection closed unexpectedly'))
    }, (e) => {
      resolver.reject(e)
    })
    const writer = connection.writable.getWriter()
    async function sendPacket(init) {
      init.checksum = calculateChecksum(init.payload)
      init.magic = init.command ^ 4294967295
      await Consumable.WritableStream.write(writer, init)
    }
    const actualFeatures = features.slice()
    if (initialDelayedAckBytes <= 0) {
      const index = features.indexOf(AdbFeature.DelayedAck)
      if (index !== -1) {
        actualFeatures.splice(index, 1)
      }
    }
    let banner
    try {
      await sendPacket({
        command: AdbCommand.Connect,
        arg0: version,
        arg1: maxPayloadSize,
        // The terminating `;` is required in formal definition
        // But ADB daemon (all versions) can still work without it
        payload: encodeUtf8(`host::features=${actualFeatures.join(',')}`),
      })
      banner = await resolver.promise
    }
    finally {
      abortController.abort()
      writer.releaseLock()
      await pipe
    }
    return new _AdbDaemonTransport({
      serial,
      connection,
      version,
      maxPayloadSize,
      banner,
      features: actualFeatures,
      initialDelayedAckBytes,
      ...options,
    })
  }

  #connection
  get connection() {
    return this.#connection
  }

  #dispatcher
  #serial
  get serial() {
    return this.#serial
  }

  #protocolVersion
  get protocolVersion() {
    return this.#protocolVersion
  }

  get maxPayloadSize() {
    return this.#dispatcher.options.maxPayloadSize
  }

  #banner
  get banner() {
    return this.#banner
  }

  get disconnected() {
    return this.#dispatcher.disconnected
  }

  #clientFeatures
  get clientFeatures() {
    return this.#clientFeatures
  }

  constructor({ serial, connection, version, banner, features = ADB_DAEMON_DEFAULT_FEATURES, initialDelayedAckBytes, ...options }) {
    this.#serial = serial
    this.#connection = connection
    this.#banner = AdbBanner.parse(banner)
    this.#clientFeatures = features
    if (features.includes(AdbFeature.DelayedAck)) {
      if (initialDelayedAckBytes <= 0) {
        throw new TypeError('`initialDelayedAckBytes` must be greater than 0 when DelayedAck feature is enabled.')
      }
      if (!this.#banner.features.includes(AdbFeature.DelayedAck)) {
        initialDelayedAckBytes = 0
      }
    }
    else {
      initialDelayedAckBytes = 0
    }
    let calculateChecksum2
    let appendNullToServiceString
    if (version >= ADB_DAEMON_VERSION_OMIT_CHECKSUM) {
      calculateChecksum2 = false
      appendNullToServiceString = false
    }
    else {
      calculateChecksum2 = true
      appendNullToServiceString = true
    }
    this.#dispatcher = new AdbPacketDispatcher(connection, {
      calculateChecksum: calculateChecksum2,
      appendNullToServiceString,
      initialDelayedAckBytes,
      ...options,
    })
    this.#protocolVersion = version
  }

  connect(service) {
    return this.#dispatcher.createSocket(service)
  }

  addReverseTunnel(handler, address) {
    if (!address) {
      const id = Math.random().toString().substring(2)
      address = `localabstract:reverse_${id}`
    }
    this.#dispatcher.addReverseTunnel(address, handler)
    return address
  }

  removeReverseTunnel(address) {
    this.#dispatcher.removeReverseTunnel(address)
  }

  clearReverseTunnels() {
    this.#dispatcher.clearReverseTunnels()
  }

  close() {
    return this.#dispatcher.close()
  }
}

// node_modules/@yume-chan/adb/esm/server/observer.js
function unorderedRemove(array, index) {
  if (index < 0 || index >= array.length) {
    return
  }
  array[index] = array[array.length - 1]
  array.length -= 1
}

// node_modules/@yume-chan/adb-daemon-webusb/esm/error.js
const DeviceBusyError = class extends Error {
  constructor(cause) {
    super('The device is already in used by another program', {
      cause,
    })
  }
}

// node_modules/@yume-chan/adb-daemon-webusb/esm/utils.js
function isErrorName(e, name) {
  return typeof e === 'object' && e !== null && 'name' in e && e.name === name
}
function isUsbInterfaceFilter(filter) {
  return filter.classCode !== void 0 && filter.subclassCode !== void 0 && filter.protocolCode !== void 0
}
function matchUsbInterfaceFilter(alternate, filter) {
  return alternate.interfaceClass === filter.classCode && alternate.interfaceSubclass === filter.subclassCode && alternate.interfaceProtocol === filter.protocolCode
}
function findUsbInterface(device, filter) {
  for (const configuration of device.configurations) {
    for (const interface_ of configuration.interfaces) {
      for (const alternate of interface_.alternates) {
        if (matchUsbInterfaceFilter(alternate, filter)) {
          return { configuration, interface_, alternate }
        }
      }
    }
  }
  return void 0
}
function padNumber(value) {
  return value.toString(16).padStart(4, '0')
}
function getSerialNumber(device) {
  if (device.serialNumber) {
    return device.serialNumber
  }
  return `${padNumber(device.vendorId)}x${padNumber(device.productId)}`
}
function findUsbEndpoints(endpoints) {
  if (endpoints.length === 0) {
    throw new TypeError('No endpoints given')
  }
  let inEndpoint
  let outEndpoint
  for (const endpoint of endpoints) {
    switch (endpoint.direction) {
      case 'in':
        inEndpoint = endpoint
        if (outEndpoint) {
          return { inEndpoint, outEndpoint }
        }
        break
      case 'out':
        outEndpoint = endpoint
        if (inEndpoint) {
          return { inEndpoint, outEndpoint }
        }
        break
    }
  }
  if (!inEndpoint) {
    throw new TypeError('No input endpoint found.')
  }
  if (!outEndpoint) {
    throw new TypeError('No output endpoint found.')
  }
  throw new Error('unreachable')
}
function matchFilter(device, filter) {
  if (filter.vendorId !== void 0 && device.vendorId !== filter.vendorId) {
    return false
  }
  if (filter.productId !== void 0 && device.productId !== filter.productId) {
    return false
  }
  if (filter.serialNumber !== void 0 && getSerialNumber(device) !== filter.serialNumber) {
    return false
  }
  if (isUsbInterfaceFilter(filter)) {
    return findUsbInterface(device, filter) || false
  }
  return true
}
function matchFilters(device, filters, exclusionFilters) {
  if (exclusionFilters && exclusionFilters.length > 0) {
    if (matchFilters(device, exclusionFilters)) {
      return false
    }
  }
  for (const filter of filters) {
    const result = matchFilter(device, filter)
    if (result) {
      return result
    }
  }
  return false
}

// node_modules/@yume-chan/adb-daemon-webusb/esm/device.js
const AdbDefaultInterfaceFilter = {
  classCode: 255,
  subclassCode: 66,
  protocolCode: 1,
}
function mergeDefaultAdbInterfaceFilter(filters) {
  if (!filters || filters.length === 0) {
    return [AdbDefaultInterfaceFilter]
  }
  else {
    return filters.map(filter => ({
      ...filter,
      classCode: filter.classCode ?? AdbDefaultInterfaceFilter.classCode,
      subclassCode: filter.subclassCode ?? AdbDefaultInterfaceFilter.subclassCode,
      protocolCode: filter.protocolCode ?? AdbDefaultInterfaceFilter.protocolCode,
    }))
  }
}
const AdbDaemonWebUsbConnection = class {
  #device
  get device() {
    return this.#device
  }

  #inEndpoint
  get inEndpoint() {
    return this.#inEndpoint
  }

  #outEndpoint
  get outEndpoint() {
    return this.#outEndpoint
  }

  #readable
  get readable() {
    return this.#readable
  }

  #writable
  get writable() {
    return this.#writable
  }

  constructor(device, inEndpoint, outEndpoint, usbManager) {
    this.#device = device
    this.#inEndpoint = inEndpoint
    this.#outEndpoint = outEndpoint
    let closed2 = false
    const duplex = new DuplexStreamFactory({
      close: async () => {
        try {
          closed2 = true
          await device.raw.close()
        }
        catch {
        }
      },
      dispose: () => {
        closed2 = true
        usbManager.removeEventListener('disconnect', handleUsbDisconnect)
      },
    })
    function handleUsbDisconnect(e) {
      if (e.device === device.raw) {
        duplex.dispose().catch(unreachable)
      }
    }
    usbManager.addEventListener('disconnect', handleUsbDisconnect)
    this.#readable = duplex.wrapReadable(new ReadableStream({
      pull: async (controller) => {
        const packet = await this.#transferIn()
        if (packet) {
          controller.enqueue(packet)
        }
        else {
          controller.close()
        }
      },
    }, { highWaterMark: 0 }))
    const zeroMask = outEndpoint.packetSize - 1
    this.#writable = pipeFrom(duplex.createWritable(new maybe_consumable_exports.WritableStream({
      write: async (chunk) => {
        try {
          await device.raw.transferOut(outEndpoint.endpointNumber, toLocalUint8Array(chunk))
          if (zeroMask && (chunk.length & zeroMask) === 0) {
            await device.raw.transferOut(outEndpoint.endpointNumber, EmptyUint8Array)
          }
        }
        catch (e) {
          if (closed2) {
            return
          }
          throw e
        }
      },
    })), new AdbPacketSerializeStream())
  }

  async #transferIn() {
    try {
      while (true) {
        const result = await this.#device.raw.transferIn(this.#inEndpoint.endpointNumber, this.#inEndpoint.packetSize)
        if (result.data.byteLength !== 24) {
          continue
        }
        const buffer2 = new Uint8Array(result.data.buffer)
        const stream = new Uint8ArrayExactReadable(buffer2)
        const packet = AdbPacketHeader.deserialize(stream)
        if (packet.magic !== (packet.command ^ 4294967295)) {
          continue
        }
        if (packet.payloadLength !== 0) {
          const result2 = await this.#device.raw.transferIn(this.#inEndpoint.endpointNumber, packet.payloadLength)
          packet.payload = new Uint8Array(result2.data.buffer)
        }
        else {
          packet.payload = EmptyUint8Array
        }
        return packet
      }
    }
    catch (e) {
      if (isErrorName(e, 'NetworkError')) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve()
          }, 100)
        })
        if (closed) {
          return void 0
        }
      }
      throw e
    }
  }
}
const AdbDaemonWebUsbDevice = class _AdbDaemonWebUsbDevice {
  static DeviceBusyError = DeviceBusyError
  #interface
  #usbManager
  #raw
  get raw() {
    return this.#raw
  }

  #serial
  get serial() {
    return this.#serial
  }

  get name() {
    return this.#raw.productName
  }

  /**
   * Create a new instance of `AdbDaemonWebUsbConnection` using a specified `USBDevice` instance
   *
   * @param device The `USBDevice` instance obtained elsewhere.
   * @param filters The filters to use when searching for ADB interface. Defaults to {@link ADB_DEFAULT_DEVICE_FILTER}.
   */
  constructor(device, interface_, usbManager) {
    this.#raw = device
    this.#serial = getSerialNumber(device)
    this.#interface = interface_
    this.#usbManager = usbManager
  }

  async #claimInterface() {
    if (!this.#raw.opened) {
      await this.#raw.open()
    }
    const { configuration, interface_, alternate } = this.#interface
    if (this.#raw.configuration?.configurationValue !== configuration.configurationValue) {
      await this.#raw.selectConfiguration(configuration.configurationValue)
    }
    if (!interface_.claimed) {
      try {
        await this.#raw.claimInterface(interface_.interfaceNumber)
      }
      catch (e) {
        if (isErrorName(e, 'NetworkError')) {
          throw new _AdbDaemonWebUsbDevice.DeviceBusyError(e)
        }
        throw e
      }
    }
    if (interface_.alternate.alternateSetting !== alternate.alternateSetting) {
      await this.#raw.selectAlternateInterface(interface_.interfaceNumber, alternate.alternateSetting)
    }
    return findUsbEndpoints(alternate.endpoints)
  }

  /**
   * Open the device and create a new connection to the ADB Daemon.
   */
  async connect() {
    const { inEndpoint, outEndpoint } = await this.#claimInterface()
    return new AdbDaemonWebUsbConnection(this, inEndpoint, outEndpoint, this.#usbManager)
  }
}

// node_modules/@yume-chan/adb-daemon-webusb/esm/observer.js
const AdbDaemonWebUsbDeviceObserver = class _AdbDaemonWebUsbDeviceObserver {
  static async create(usb, options = {}) {
    const devices = await usb.getDevices()
    return new _AdbDaemonWebUsbDeviceObserver(usb, devices, options)
  }

  #filters
  #exclusionFilters
  #usbManager
  #onDeviceAdd = new EventEmitter()
  onDeviceAdd = this.#onDeviceAdd.event
  #onDeviceRemove = new EventEmitter()
  onDeviceRemove = this.#onDeviceRemove.event
  #onListChange = new StickyEventEmitter()
  onListChange = this.#onListChange.event
  current = []
  constructor(usb, initial, options = {}) {
    this.#filters = mergeDefaultAdbInterfaceFilter(options.filters)
    this.#exclusionFilters = options.exclusionFilters
    this.#usbManager = usb
    this.current = initial.map(device => this.#convertDevice(device)).filter(device => !!device)
    this.#onListChange.fire(this.current)
    this.#usbManager.addEventListener('connect', this.#handleConnect)
    this.#usbManager.addEventListener('disconnect', this.#handleDisconnect)
  }

  #convertDevice(device) {
    const interface_ = matchFilters(device, this.#filters, this.#exclusionFilters)
    if (!interface_) {
      return void 0
    }
    return new AdbDaemonWebUsbDevice(device, interface_, this.#usbManager)
  }

  #handleConnect = (e) => {
    const device = this.#convertDevice(e.device)
    if (!device) {
      return
    }
    if (this.current.some(item => item.raw === device.raw)) {
      return
    }
    const next = this.current.slice()
    next.push(device)
    this.current = next
    this.#onDeviceAdd.fire([device])
    this.#onListChange.fire(this.current)
  }

  #handleDisconnect = (e) => {
    const index = this.current.findIndex(device => device.raw === e.device)
    if (index !== -1) {
      const device = this.current[index]
      const next = this.current.slice()
      unorderedRemove(next, index)
      this.current = next
      this.#onDeviceRemove.fire([device])
      this.#onListChange.fire(this.current)
    }
  }

  stop() {
    this.#usbManager.removeEventListener('connect', this.#handleConnect)
    this.#usbManager.removeEventListener('disconnect', this.#handleDisconnect)
    this.#onDeviceAdd.dispose()
    this.#onDeviceRemove.dispose()
    this.#onListChange.dispose()
  }
}

// node_modules/@yume-chan/adb-daemon-webusb/esm/manager.js
const AdbDaemonWebUsbDeviceManager = class _AdbDaemonWebUsbDeviceManager {
  /**
   * Gets the instance of {@link AdbDaemonWebUsbDeviceManager} using browser WebUSB implementation.
   *
   * May be `undefined` if current runtime does not support WebUSB.
   */
  static BROWSER = /* @__PURE__ */ (() => typeof globalThis.navigator !== 'undefined' && globalThis.navigator.usb ? new _AdbDaemonWebUsbDeviceManager(globalThis.navigator.usb) : void 0)()
  #usbManager
  /**
   * Create a new instance of {@link AdbDaemonWebUsbDeviceManager} using the specified WebUSB implementation.
   * @param usbManager A WebUSB compatible interface.
   */
  constructor(usbManager) {
    this.#usbManager = usbManager
  }

  /**
   * Call `USB#requestDevice()` to prompt the user to select a device.
   */
  async requestDevice(options = {}) {
    const filters = mergeDefaultAdbInterfaceFilter(options.filters)
    try {
      const device = await this.#usbManager.requestDevice({
        filters,
        exclusionFilters: options.exclusionFilters,
      })
      const interface_ = matchFilters(device, filters, options.exclusionFilters)
      if (!interface_) {
        return void 0
      }
      this.#usbManager.dispatchEvent(new USBConnectionEvent('connect', { device }))
      return new AdbDaemonWebUsbDevice(device, interface_, this.#usbManager)
    }
    catch (e) {
      if (isErrorName(e, 'NotFoundError')) {
        return void 0
      }
      throw e
    }
  }

  /**
   * Get all connected and requested devices that match the specified filters.
   */
  async getDevices(options = {}) {
    const filters = mergeDefaultAdbInterfaceFilter(options.filters)
    const devices = await this.#usbManager.getDevices()
    const result = []
    for (const device of devices) {
      const interface_ = matchFilters(device, filters, options.exclusionFilters)
      if (interface_) {
        result.push(new AdbDaemonWebUsbDevice(device, interface_, this.#usbManager))
      }
    }
    return result
  }

  trackDevices(options = {}) {
    return AdbDaemonWebUsbDeviceObserver.create(this.#usbManager, options)
  }
}

// node_modules/@yume-chan/adb-credential-web/esm/index.js
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('Tango', 1)
    request.onerror = () => {
      reject(request.error)
    }
    request.onupgradeneeded = () => {
      const db = request.result
      db.createObjectStore('Authentication', { autoIncrement: true })
    }
    request.onsuccess = () => {
      const db = request.result
      resolve(db)
    }
  })
}
async function saveKey(key) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('Authentication', 'readwrite')
    const store = transaction.objectStore('Authentication')
    const putRequest = store.add(key)
    putRequest.onerror = () => {
      reject(putRequest.error)
    }
    putRequest.onsuccess = () => {
      resolve()
    }
    transaction.onerror = () => {
      reject(transaction.error)
    }
    transaction.oncomplete = () => {
      db.close()
    }
  })
}
async function getAllKeys() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('Authentication', 'readonly')
    const store = transaction.objectStore('Authentication')
    const getRequest = store.getAll()
    getRequest.onerror = () => {
      reject(getRequest.error)
    }
    getRequest.onsuccess = () => {
      resolve(getRequest.result)
    }
    transaction.onerror = () => {
      reject(transaction.error)
    }
    transaction.oncomplete = () => {
      db.close()
    }
  })
}
const AdbWebCredentialStore = class {
  #appName
  constructor(appName = 'Tango') {
    this.#appName = appName
  }

  /**
   * Generates a RSA private key and store it into LocalStorage.
   *
   * Calling this method multiple times will overwrite the previous key.
   *
   * @returns The private key in PKCS #8 format.
   */
  async generateKey() {
    const { privateKey: cryptoKey } = await crypto.subtle.generateKey({
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      // 65537
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-1',
    }, true, ['sign', 'verify'])
    const privateKey = new Uint8Array(await crypto.subtle.exportKey('pkcs8', cryptoKey))
    await saveKey(privateKey)
    return {
      buffer: privateKey,
      name: `${this.#appName}@${globalThis.location.hostname}`,
    }
  }

  /**
   * Yields the stored RSA private key.
   *
   * This method returns a generator, so `for await...of...` loop should be used to read the key.
   */
  async* iterateKeys() {
    for (const key of await getAllKeys()) {
      yield {
        buffer: key,
        name: `${this.#appName}@${globalThis.location.hostname}`,
      }
    }
  }
}
export {
  Adb,
  AdbDaemonTransport,
  AdbDaemonWebUsbDeviceManager,
  AdbWebCredentialStore,
}
