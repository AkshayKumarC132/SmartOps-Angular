
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

// =========================================================
// KNOWLEDGE BASE ARTICLE
// =========================================================

interface KBArticle {
  id: number;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  tags?: any;
  status?: string;
  published_at?: string | null;
  created_by?: any;
  updated_by?: any;
  created_at?: string;
  updated_at?: string;
  slug?: string;
  rendered_content?: string;

  helpful_count?: number;
  not_helpful_count?: number;
  current_user_feedback?: 'like' | 'dislike' | null;
}

// =========================================================
// COMPONENT
// =========================================================

@Component({
  selector: 'app-knowledge-base-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './knowledge-base-details.html',
  styleUrl: './knowledge-base-details.css'
})
export class KnowledgeBaseDetails implements OnInit {

  // ARTICLE
  article: KBArticle | null = null;

  // PAGE STATE
  loading = true;
  errorMessage = '';
  unpublishing = false;
  publishing = false;

  // FEEDBACK
  feedback: 'like' | 'dislike' | null = null;
  feedbackSubmitted = false;
  feedbackSubmitting = false;

  // API
  private apiUrl = `${environment.apiUrl}/kb/articles/`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  // =======================================================
  // INIT
  // =======================================================

  ngOnInit(): void {
    const articleId = this.route.snapshot.paramMap.get('id');

    console.log('Knowledge Base Article ID:', articleId);

    if (!articleId) {
      this.loading = false;
      this.errorMessage = 'Article ID not found.';
      this.cdr.detectChanges();
      return;
    }

    this.loadArticle(articleId);
  }

  // =======================================================
  // LOAD ARTICLE
  // =======================================================

  loadArticle(articleId: string): void {
    this.loading = true;
    this.errorMessage = '';

    const url = `${this.apiUrl}${articleId}/`;

    console.log('Knowledge Base Article API URL:', url);

    this.http.get<KBArticle>(url).subscribe({
      next: (response) => {
        console.log('Knowledge Base Article Response:', response);

        this.article = response;

        // Restore feedback saved for the logged-in user.
        this.feedback = response.current_user_feedback ?? null;

        this.feedbackSubmitted =
          response.current_user_feedback === 'like' ||
          response.current_user_feedback === 'dislike';

        this.loading = false;
        this.errorMessage = '';

        console.log('Article loaded:', this.article);
        console.log('Current user feedback:', this.feedback);

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Knowledge Base Article API Error:', error);
        console.error('Status:', error.status);
        console.error('Error body:', error.error);
        console.error('URL:', error.url);

        this.loading = false;
        this.article = null;

        if (error.status === 401) {
          this.errorMessage =
            'Authentication failed. Please login again.';
        } else if (error.status === 403) {
          this.errorMessage =
            'You do not have permission to view this article.';
        } else if (error.status === 404) {
          this.errorMessage = 'Knowledge Base article not found.';
        } else if (error.status === 0) {
          this.errorMessage =
            'Unable to connect to the Knowledge Base API.';
        } else {
          this.errorMessage =
            `Unable to load article. Error: ${error.status}`;
        }

        this.cdr.detectChanges();
      }
    });
  }

  // =======================================================
  // BACK
  // =======================================================

  goBack(): void {
    this.router.navigate(['/knowledge-base']);
  }

  // =======================================================
  // EDIT ARTICLE
  // =======================================================

  editArticle(): void {
    if (!this.article) {
      return;
    }

    this.router.navigate([
      '/knowledge-base',
      this.article.id,
      'edit'
    ]);
  }

  // =======================================================
  // CHECK PUBLISHED STATUS
  // =======================================================

  isPublished(): boolean {
    if (!this.article?.status) {
      return false;
    }

    const status = this.article.status
      .toLowerCase()
      .replace(/[\s-]/g, '_');

    return status === 'published' || status === 'publish';
  }

  // =======================================================
  // CHECK DRAFT STATUS
  // =======================================================

  isDraft(): boolean {
    if (!this.article?.status) {
      return false;
    }

    const status = this.article.status
      .toLowerCase()
      .replace(/[\s-]/g, '_');

    return status === 'draft';
  }

  // =======================================================
  // UNPUBLISH ARTICLE
  // PATCH /kb/articles/{id}/
  // Payload: { status: 'draft' }
  // =======================================================

  async unpublishArticle(): Promise<void> {
    if (
      !this.article ||
      this.unpublishing ||
      this.publishing
    ) {
      return;
    }

    const result = await Swal.fire({
      title: 'Unpublish article?',
      text: 'Are you sure you want to unpublish this article? It will be moved to Draft.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Unpublish',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
      confirmButtonColor: '#239f99',
      cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.unpublishing = true;

    const articleId = this.article.id;
    const url = `${this.apiUrl}${articleId}/`;

    const payload = {
      status: 'draft'
    };

    console.log('Unpublish API URL:', url);
    console.log('Unpublish payload:', payload);

    this.http.patch<any>(url, payload).subscribe({
      next: (response) => {
        console.log('Article unpublished successfully:', response);

        this.unpublishing = false;

        if (this.article) {
          this.article = {
            ...this.article,
            ...(response || {}),
            status: 'draft',
            published_at: null
          };
        }

        this.cdr.detectChanges();

        void Swal.fire({
          title: 'Article unpublished!',
          text: 'Article unpublished successfully. It is now a Draft.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#239f99'
        });
      },

      error: (error) => {
        console.error('Unpublish article error:', error);

        this.unpublishing = false;

        const errorMessage =
          error.error?.detail ||
          error.error?.message ||
          'Unable to unpublish the article.';

        this.cdr.detectChanges();

        void Swal.fire({
          title: 'Unpublish failed',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  // =======================================================
  // PUBLISH ARTICLE
  // PATCH /kb/articles/{id}/
  // Payload: { status: 'published' }
  // =======================================================

  async publishArticle(): Promise<void> {
    if (
      !this.article ||
      this.publishing ||
      this.unpublishing
    ) {
      return;
    }

    const result = await Swal.fire({
      title: 'Publish article?',
      text: 'Are you sure you want to publish this article?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Publish',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
      confirmButtonColor: '#239f99',
      cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.publishing = true;

    const articleId = this.article.id;
    const url = `${this.apiUrl}${articleId}/`;

    const payload = {
      status: 'published'
    };

    console.log('Publish API URL:', url);
    console.log('Publish payload:', payload);

    this.http.patch<any>(url, payload).subscribe({
      next: (response) => {
        console.log('Article published successfully:', response);

        this.publishing = false;

        if (this.article) {
          this.article = {
            ...this.article,
            status: response?.status || 'published',
            published_at:
              response?.published_at ??
              this.article.published_at ??
              new Date().toISOString()
          };
        }

        if (
          response &&
          typeof response === 'object' &&
          this.article
        ) {
          this.article = {
            ...this.article,
            ...response,
            status: response.status || 'published'
          };
        }

        if (this.article) {
          this.article = {
            ...this.article,
            status: 'published'
          };
        }

        this.cdr.detectChanges();

        void Swal.fire({
          title: 'Article published!',
          text: 'Article published successfully.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#239f99'
        });
      },

      error: (error) => {
        console.error('Publish article error:', error);

        this.publishing = false;

        const errorMessage =
          error.error?.detail ||
          error.error?.message ||
          'Unable to publish the article.';

        this.cdr.detectChanges();

        void Swal.fire({
          title: 'Publish failed',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  // =======================================================
  // ARTICLE FEEDBACK
  // Uses existing ArticleFeedbackSerializer
  // POST /kb/articles/{id}/feedback/
  // =======================================================

  submitFeedback(type: 'like' | 'dislike'): void {

    if (
      !this.article ||
      this.feedbackSubmitted ||
      this.feedbackSubmitting
    ) {
      return;
    }

    const articleId = this.article.id;
    const url = `${this.apiUrl}${articleId}/feedback/`;

    const payload = {
      is_helpful: type === 'like',
      feedback_type: type === 'like'
        ? 'helpful'
        : 'incomplete',
      remarks: ''
    };

    this.feedbackSubmitting = true;

    console.log('Submitting article feedback:', payload);
    console.log('Feedback API URL:', url);

    this.http.post<any>(url, payload).subscribe({

      next: (response) => {
        console.log('Feedback saved successfully:', response);

        this.feedback = type;
        this.feedbackSubmitted = true;
        this.feedbackSubmitting = false;

        this.cdr.detectChanges();

        // Reload authoritative counts and saved user feedback.
        this.loadArticle(String(articleId));
      },

      error: (error) => {
        console.error('Feedback submission failed:', error);
        console.error('Feedback API status:', error.status);
        console.error('Feedback API response:', error.error);

        this.feedbackSubmitting = false;

        const message =
          error.error?.detail ||
          error.error?.message ||
          error.error?.feedback_type?.[0] ||
          error.error?.is_helpful?.[0] ||
          'Unable to submit feedback. Please try again.';

        this.cdr.detectChanges();

        void Swal.fire({
          title: 'Feedback Failed',
          text: message,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#239f99'
        });
      }
    });
  }

  // =======================================================
  // FORMAT STATUS
  // =======================================================

  formatStatus(status: string | undefined): string {
    if (!status) {
      return '';
    }

    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  // =======================================================
  // FORMAT DATE
  // =======================================================

  formatDate(date: string | null | undefined): string {
    if (!date) {
      return '—';
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return '—';
    }

    return parsedDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // =======================================================
  // AUTHOR
  // =======================================================

  getAuthor(article: KBArticle): string {
    const author = article.created_by;

    if (!author) {
      return 'admin';
    }

    if (typeof author === 'string') {
      return author;
    }

    if (typeof author === 'object') {
      return (
        author.username ||
        author.email ||
        author.name ||
        'admin'
      );
    }

    return 'admin';
  }

  // =======================================================
  // HELPFUL COUNT
  // =======================================================

  getLikes(article: KBArticle): number {
    return article.helpful_count ?? 0;
  }

  // =======================================================
  // NOT HELPFUL COUNT
  // =======================================================

  getDislikes(article: KBArticle): number {
    return article.not_helpful_count ?? 0;
  }

  // =======================================================
  // TAGS
  // =======================================================

  getTags(article: KBArticle): string[] {
    if (!article.tags) {
      return [];
    }

    if (Array.isArray(article.tags)) {
      return article.tags;
    }

    if (typeof article.tags === 'string') {
      return article.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => !!tag);
    }

    return [];
  }
}
