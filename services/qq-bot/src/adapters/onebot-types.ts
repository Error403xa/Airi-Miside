export interface OneBotSender {
  user_id: number
  nickname: string
  card?: string
  sex?: 'male' | 'female' | 'unknown'
  age?: number
  area?: string
  level?: string
  role?: 'owner' | 'admin' | 'member'
  title?: string
}

export interface OneBotMessageSegment {
  type: string
  data: Record<string, unknown>
}

export interface OneBotPrivateMessageEvent {
  time: number
  self_id: number
  post_type: 'message'
  message_type: 'private'
  sub_type: 'friend' | 'group' | 'other'
  message_id: number
  user_id: number
  message: OneBotMessageSegment[] | string
  raw_message: string
  font: number
  sender: OneBotSender
}

export interface OneBotGroupMessageEvent {
  time: number
  self_id: number
  post_type: 'message'
  message_type: 'group'
  sub_type: 'normal' | 'anonymous' | 'notice'
  message_id: number
  group_id: number
  user_id: number
  anonymous?: { id: number, name: string, flag: string } | null
  message: OneBotMessageSegment[] | string
  raw_message: string
  font: number
  sender: OneBotSender
}

export type OneBotMessageEvent = OneBotPrivateMessageEvent | OneBotGroupMessageEvent

export interface OneBotLifecycleMetaEvent {
  time: number
  self_id: number
  post_type: 'meta_event'
  meta_event_type: 'lifecycle'
  sub_type: 'enable' | 'disable' | 'connect'
}

export interface OneBotHeartbeatMetaEvent {
  time: number
  self_id: number
  post_type: 'meta_event'
  meta_event_type: 'heartbeat'
  status: {
    online: boolean
    good: boolean
  }
  interval: number
}

export type OneBotMetaEvent = OneBotLifecycleMetaEvent | OneBotHeartbeatMetaEvent

export interface OneBotNoticeEvent {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: string
  [key: string]: unknown
}

export interface OneBotRequestEvent {
  time: number
  self_id: number
  post_type: 'request'
  request_type: string
  [key: string]: unknown
}

export type OneBotEvent = OneBotMessageEvent | OneBotMetaEvent | OneBotNoticeEvent | OneBotRequestEvent

export interface OneBotActionRequest {
  action: string
  params: Record<string, unknown>
  echo?: string
}

export interface OneBotActionResponse {
  status: 'ok' | 'async' | 'failed'
  retcode: number
  data: unknown
  echo?: string
}

export interface QQReplyContext {
  messageType: 'private' | 'group'
  userId: number
  groupId?: number
  nickname: string
  card?: string
  selfId: number
}
