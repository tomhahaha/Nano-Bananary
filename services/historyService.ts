import type { GeneratedContent } from '../types';

interface HistoryItem {
  id: string;
  type: 'image' | 'video';
  originalImageUrl?: string;
  resultImageUrl?: string;
  resultVideoUrl?: string;
  secondaryImageUrl?: string;
  transformationKey: string;
  prompt?: string;
  createdAt: string;
}

interface HistoryResponse {
  success: boolean;
  history?: HistoryItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

interface SaveHistoryRequest {
  type: 'image' | 'video';
  originalImageUrl?: string;
  resultImageUrl?: string;
  resultVideoUrl?: string;
  secondaryImageUrl?: string;
  transformationKey: string;
  prompt?: string;
}

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api.com/api' 
  : 'http://localhost:3001/api';

class HistoryService {
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('auth_token');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async saveHistory(historyData: SaveHistoryRequest): Promise<{ success: boolean; historyId?: string; message?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; historyId: string; message: string }>('/history', {
        method: 'POST',
        body: JSON.stringify(historyData),
      });

      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '保存历史记录失败'
      };
    }
  }

  async getHistory(page: number = 1, limit: number = 20): Promise<HistoryResponse> {
    try {
      const response = await this.makeRequest<HistoryResponse>(`/history?page=${page}&limit=${limit}`);
      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '获取历史记录失败'
      };
    }
  }

  async deleteHistoryItem(historyId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>(`/history/${historyId}`, {
        method: 'DELETE',
      });

      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '删除历史记录失败'
      };
    }
  }

  // Convert API history item to GeneratedContent format
  convertToGeneratedContent(historyItem: HistoryItem): GeneratedContent {
    return {
      imageUrl: historyItem.resultImageUrl || null,
      videoUrl: historyItem.resultVideoUrl || null,
      secondaryImageUrl: historyItem.secondaryImageUrl || null,
      text: historyItem.prompt || null,
    };
  }

  // Helper method to save generated content
  async saveGeneratedContent(
    content: GeneratedContent,
    transformationKey: string,
    originalImageUrl?: string,
    prompt?: string
  ): Promise<boolean> {
    try {
      const historyData: SaveHistoryRequest = {
        type: content.videoUrl ? 'video' : 'image',
        originalImageUrl,
        resultImageUrl: content.imageUrl || undefined,
        resultVideoUrl: content.videoUrl || undefined,
        secondaryImageUrl: content.secondaryImageUrl || undefined,
        transformationKey,
        prompt,
      };

      const result = await this.saveHistory(historyData);
      return result.success;
    } catch (error) {
      console.error('Failed to save generated content:', error);
      return false;
    }
  }

  // Fallback to localStorage if API is not available
  private getLocalStorageKey(): string {
    return 'user_history';
  }

  saveToLocalStorage(content: GeneratedContent): void {
    try {
      const existingHistory = this.getFromLocalStorage();
      const newHistory = [content, ...existingHistory.slice(0, 49)]; // Keep only 50 items
      localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  getFromLocalStorage(): GeneratedContent[] {
    try {
      const stored = localStorage.getItem(this.getLocalStorageKey());
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get from localStorage:', error);
      return [];
    }
  }

  clearLocalStorage(): void {
    localStorage.removeItem(this.getLocalStorageKey());
  }
}

export const historyService = new HistoryService();
export type { HistoryItem, HistoryResponse, SaveHistoryRequest };