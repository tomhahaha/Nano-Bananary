
import type { GeneratedContent } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const PROXY_BASE_URL = 'https://ai.juguang.chat/v1beta/models';
const API_KEY = process.env.API_KEY;

export async function editImage(
    base64ImageData: string | null, 
    mimeType: string | null, 
    prompt: string,
    maskBase64: string | null,
    secondaryImage: { base64: string; mimeType: string } | null,
    enhancedMode?: boolean,
    aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
    imageSize?: 'SMALL' | 'MEDIUM' | 'LARGE',
    googleSearch?: boolean
): Promise<GeneratedContent> {
  try {
    let fullPrompt = prompt;
    const parts: any[] = [];
    
    // 支持主图像可选
    if (base64ImageData && mimeType) {
      parts.push({
        inlineData: {
          data: base64ImageData,
          mimeType: mimeType,
        },
      });
    }

    if (maskBase64) {
      parts.push({
        inlineData: {
          data: maskBase64,
          mimeType: 'image/png',
        },
      });
      fullPrompt = `Apply the following instruction only to the masked area of the image: "${prompt}". Preserve the unmasked area.`;
    }
    
    if (secondaryImage) {
        parts.push({
            inlineData: {
                data: secondaryImage.base64,
                mimeType: secondaryImage.mimeType,
            },
        });
    }

    parts.push({ text: fullPrompt });
    
    // 确定使用的模型
    const modelName = enhancedMode ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image-preview';
    
    // 构建请求体
    const requestBody: any = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    };
    
    // 增强模式下添加额外参数
    if (enhancedMode) {
      if (aspectRatio) {
        requestBody.generationConfig.aspectRatio = aspectRatio;
      }
      if (imageSize) {
        requestBody.generationConfig.imageSize = imageSize;
      }
      if (googleSearch !== undefined) {
        requestBody.google_search = googleSearch;
      }
    }

    const response = await fetch(`${PROXY_BASE_URL}/${modelName}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const data = await response.json();

    const result: GeneratedContent = { imageUrl: null, text: null };
    const responseParts = data.candidates?.[0]?.content?.parts;

    if (responseParts) {
      for (const part of responseParts) {
        if (part.text) {
          result.text = (result.text ? result.text + "\n" : "") + part.text;
        } else if (part.inlineData) {
          result.imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    if (!result.imageUrl) {
        let errorMessage;
        if (result.text) {
            errorMessage = `The model responded: "${result.text}"`;
        } else {
            const finishReason = data.candidates?.[0]?.finishReason;
            const safetyRatings = data.candidates?.[0]?.safetyRatings;
            errorMessage = "The model did not return an image. It might have refused the request. Please try a different image or prompt.";
            
            if (finishReason === 'SAFETY') {
                const blockedCategories = safetyRatings?.filter(r => r.blocked).map(r => r.category).join(', ');
                errorMessage = `The request was blocked for safety reasons. Categories: ${blockedCategories || 'Unknown'}. Please modify your prompt or image.`;
            }
        }
        throw new Error(errorMessage);
    }

    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        let errorMessage = error.message;
        try {
            const parsedError = JSON.parse(errorMessage);
            if (parsedError.error && parsedError.error.message) {
                if (parsedError.error.status === 'RESOURCE_EXHAUSTED') {
                    errorMessage = "You've likely exceeded the request limit. Please wait a moment before trying again.";
                } else if (parsedError.error.code === 500 || parsedError.error.status === 'UNKNOWN') {
                    errorMessage = "An unexpected server error occurred. This might be a temporary issue. Please try again in a few moments.";
                } else {
                    errorMessage = parsedError.error.message;
                }
            }
        } catch (e) {}
        throw new Error(errorMessage);
    }
    throw new Error("An unknown error occurred while communicating with the API.");
  }
}

export async function generateVideo(
    prompt: string,
    image: { base64: string; mimeType: string } | null,
    aspectRatio: '16:9' | '9:16',
    onProgress: (message: string) => void
): Promise<string> {
    try {
        onProgress("Initializing video generation...");

        const requestBody = {
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                aspectRatio: aspectRatio
            },
            ...(image && {
                image: {
                    imageBytes: image.base64,
                    mimeType: image.mimeType
                }
            })
        };

        // 注意：视频生成API可能需要不同的端点，这里使用相同的代理地址结构
        // 您可能需要根据实际的代理API文档调整端点
        const response = await fetch(`${PROXY_BASE_URL}/veo-2.0-generate-001:generateVideos?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorData}`);
        }

        let operation = await response.json();
        
        onProgress("Polling for results, this may take a few minutes...");

        // 轮询操作状态
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            const pollResponse = await fetch(`${PROXY_BASE_URL}/operations/${operation.name}?key=${API_KEY}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!pollResponse.ok) {
                throw new Error(`Polling failed: HTTP ${pollResponse.status}`);
            }
            
            operation = await pollResponse.json();
        }

        if (operation.error) {
            throw new Error(operation.error.message || "Video generation failed during operation.");
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was found.");
        }

        return `${downloadLink}&key=${API_KEY}`;

    } catch (error) {
        console.error("Error calling Video Generation API:", error);
        if (error instanceof Error) {
            let errorMessage = error.message;
            try {
                const parsedError = JSON.parse(errorMessage);
                if (parsedError.error && parsedError.error.message) {
                    errorMessage = parsedError.error.message;
                }
            } catch (e) {}
            throw new Error(errorMessage);
        }
        throw new Error("An unknown error occurred during video generation.");
    }
}
