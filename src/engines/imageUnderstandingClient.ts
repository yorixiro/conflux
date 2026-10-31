import type { AssistantReply, RequestAssistantReplyParams } from './chat-api/chatApiTypes';
import { requestAssistantReply } from './chatApi';
import type { AssistantRequestContext } from './request/requestContext';
import type { ImageUnderstandingSettings, ProviderProfile } from '../types/domain';

export type ImageUnderstandingRequestReply = (
  params: RequestAssistantReplyParams
) => Promise<AssistantReply>;

const IMAGE_UNDERSTANDING_SYSTEM_PROMPT = [
  '你是 Polaris 的图片理解与 OCR 模型。',
  '任务是把用户给出的图片转换成主对话模型可直接阅读的中文文本。',
  '优先提取图片里的可见文字、界面字段、表格、错误信息、标注和关系；再补充必要的视觉描述。',
  '不要回答用户问题，不要替主模型下结论，不要编造看不见的内容。',
  '如果图片内容不清楚，明确写出不清楚的区域。'
].join('\n');

export function resolveImageUnderstandingProvider(args: {
  settings?: ImageUnderstandingSettings;
  providers?: ProviderProfile[];
  globalApi: ProviderProfile;
}) {
  if (args.settings?.enabled !== true) return null;
  const providerId = args.settings.providerId?.trim();
  // Never fall back to the text-only ACP model for an image understanding call.
  // Explicitly selected but removed providers also must not silently reroute.
  if (!providerId && args.globalApi.agentTransport === 'devin-acp') return null;
  const selected = providerId
    ? args.providers?.find((provider) => provider.id === providerId)
    : args.globalApi;
  if (!selected || selected.agentTransport === 'devin-acp') return null;
  const modelOverride = args.settings.modelOverride?.trim();
  return modelOverride ? { ...selected, model: modelOverride } : selected;
}

export function resolveProviderImageUnderstandingSettings(args: {
  api: ProviderProfile;
}) {
  return args.api.imageUnderstanding;
}

export function buildImageUnderstandingRequestContext(params: {
  imageDataUrl: string;
  imageName: string;
}): AssistantRequestContext {
  return {
    memorySlots: {
      session: [],
      profile: [],
      pin: []
    },
    attachmentSlots: {
      enabled: true,
      pending: [{
        id: 'image-understanding',
        kind: 'image',
        name: params.imageName
      }]
    },
    segments: [
      {
        kind: 'system',
        messages: [{
          role: 'system',
          content: IMAGE_UNDERSTANDING_SYSTEM_PROMPT
        }]
      },
      {
        kind: 'conversation',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                `图片名：${params.imageName}`,
                '请输出这张图片的 OCR 与视觉理解结果，给后续主对话模型使用。'
              ].join('\n')
            },
            {
              type: 'image_url',
              image_url: {
                url: params.imageDataUrl
              }
            }
          ]
        }]
      }
    ],
    toolChoice: 'none'
  };
}

export async function requestImageUnderstanding(params: {
  api: ProviderProfile;
  imageDataUrl: string;
  imageName: string;
  signal?: AbortSignal;
  requestReply?: ImageUnderstandingRequestReply;
}) {
  const requestReply = params.requestReply ?? requestAssistantReply;
  const reply = await requestReply({
    api: params.api,
    context: buildImageUnderstandingRequestContext({
      imageDataUrl: params.imageDataUrl,
      imageName: params.imageName
    }),
    signal: params.signal
  });
  const content = reply.content.trim();
  if (!content) {
    throw new Error('图片理解模型没有返回可读内容。');
  }
  return content;
}
