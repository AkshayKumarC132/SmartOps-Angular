import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface AIResult {
  id: number;
  ticketId: string;
  provider: string;
  modelName: string;
  processingStatus: string;
  reviewStatus: string;
  result: string;
  createdAt: string;
}

@Component({
  selector: 'app-ai-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-results.html',
  styleUrl: './ai-results.css'
})
export class AiResults {

  results: AIResult[] = [
    {
      id: 1,
      ticketId: 'SOP-2045',
      provider: 'OpenAI',
      modelName: 'GPT-4o',
      processingStatus: 'COMPLETED',
      reviewStatus: 'APPROVED',
      result: 'The user is experiencing repeated authentication failures. The analysis indicates that the account may be locked or the authentication credentials may require verification.',
      createdAt: '9/28/2026, 10:24 AM'
    },
    {
      id: 2,
      ticketId: 'SOP-2051',
      provider: 'Ollama',
      modelName: 'Llama 3',
      processingStatus: 'COMPLETED',
      reviewStatus: 'REVIEW_PENDING',
      result: 'The reported application slowdown is likely related to high server resource utilization. Reviewing CPU, memory usage and application logs is recommended.',
      createdAt: '9/28/2026, 12:48 PM'
    },
    {
      id: 3,
      ticketId: 'SOP-2058',
      provider: 'OpenAI',
      modelName: 'GPT-4o',
      processingStatus: 'COMPLETED',
      reviewStatus: 'APPROVED',
      result: 'The request appears to be related to an access permission issue. The requester should be verified and the required application role should be assigned.',
      createdAt: '9/29/2026, 9:16 AM'
    },
    {
      id: 4,
      ticketId: 'SOP-2063',
      provider: 'Ollama',
      modelName: 'Llama 3',
      processingStatus: 'PROCESSING',
      reviewStatus: 'NOT_READY',
      result: 'AI analysis is currently being generated for this ticket.',
      createdAt: '9/29/2026, 2:31 PM'
    },
    {
      id: 5,
      ticketId: 'SOP-2070',
      provider: 'OpenAI',
      modelName: 'GPT-4o',
      processingStatus: 'FAILED',
      reviewStatus: 'NOT_READY',
      result: 'AI processing could not be completed because the configured provider returned an error.',
      createdAt: '9/30/2026, 11:07 AM'
    },
    {
      id: 6,
      ticketId: 'SOP-2074',
      provider: 'OpenAI',
      modelName: 'GPT-4o',
      processingStatus: 'COMPLETED',
      reviewStatus: 'REVIEW_PENDING',
      result: 'The ticket description indicates a possible network connectivity problem. The support team should verify the user network, DNS resolution and internal service availability.',
      createdAt: '9/30/2026, 1:42 PM'
    }
  ];

  get totalResults(): number {
    return this.results.length;
  }

  get completedResults(): number {
    return this.results.filter(
      result => result.processingStatus === 'COMPLETED'
    ).length;
  }

  get pendingReviews(): number {
    return this.results.filter(
      result => result.reviewStatus === 'REVIEW_PENDING'
    ).length;
  }

  get averageConfidence(): number {
    return 86;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }
}