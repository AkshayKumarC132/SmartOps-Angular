
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
  likes?: number;
  dislikes?: number;
  like_count?: number;
  dislike_count?: number;
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
    this.article = null;

    const url = `${this.apiUrl}${articleId}/`;

    console.log('Knowledge Base Article API URL:', url);

    this.http.get<KBArticle>(url).subscribe({
      next: (response) => {
        console.log('Knowledge Base Article Response:', response);

        this.article = response;
        this.loading = false;
        this.errorMessage = '';

        console.log('Article loaded:', this.article);

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
  //
  // Existing endpoint:
  // PATCH /kb/articles/{id}/
  //
  // Payload: { status: 'draft' }
  //
  // IMPORTANT: Do not use the separate /unpublish/
  // endpoint because that endpoint deletes the article.
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

    console.log(
      'Unpublishing Knowledge Base Article:',
      articleId
    );

    console.log('Unpublish API URL:', url);
    console.log('Unpublish payload:', payload);

    this.http.patch<any>(url, payload).subscribe({
      next: (response) => {
        console.log(
          'Article unpublished successfully:',
          response
        );

        this.unpublishing = false;

        // Preserve the article and update its status.
        if (this.article) {
          this.article = {
            ...this.article,
            ...(response || {}),
            status: 'draft',
            published_at: null
          };
        }

        console.log(
          'Article status changed to Draft:',
          this.article
        );

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
        console.error('Status:', error.status);
        console.error('Error body:', error.error);
        console.error('URL:', error.url);

        this.unpublishing = false;

        let errorMessage =
          'Unable to unpublish the article.';

        if (error.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        }

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
  //
  // Existing endpoint:
  // PATCH /kb/articles/{id}/
  //
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

    console.log(
      'Publishing Knowledge Base Article:',
      articleId
    );

    console.log('Publish API URL:', url);
    console.log('Publish payload:', payload);

    this.http.patch<any>(url, payload).subscribe({
      next: (response) => {
        console.log(
          'Article published successfully:',
          response
        );

        this.publishing = false;

        // Preserve the existing response-merge behavior.
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

        // Merge the complete backend response if provided.
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

        // Ensure the UI displays Published.
        if (this.article) {
          this.article = {
            ...this.article,
            status: 'published'
          };
        }

        console.log(
          'Article is now Published:',
          this.article
        );

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
        console.error('Status:', error.status);
        console.error('Error body:', error.error);
        console.error('URL:', error.url);

        this.publishing = false;

        let errorMessage =
          'Unable to publish the article.';

        if (error.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        }

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
  // FEEDBACK
  // =======================================================

  submitFeedback(
    type: 'like' | 'dislike'
  ): void {
    if (!this.article || this.feedbackSubmitted) {
      return;
    }

    this.feedback = type;
    this.feedbackSubmitted = true;

    // Existing feedback behavior is UI-only.
    if (type === 'like') {
      this.article = {
        ...this.article,
        like_count: this.getLikes(this.article) + 1
      };
    } else {
      this.article = {
        ...this.article,
        dislike_count: this.getDislikes(this.article) + 1
      };
    }

    this.cdr.detectChanges();
  }

  // =======================================================
  // FORMAT STATUS
  // =======================================================

  formatStatus(
    status: string | undefined
  ): string {
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

  formatDate(
    date: string | null | undefined
  ): string {
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
  // LIKES
  // =======================================================

  getLikes(article: KBArticle): number {
    if (typeof article.likes === 'number') {
      return article.likes;
    }

    if (typeof article.like_count === 'number') {
      return article.like_count;
    }

    return 0;
  }

  // =======================================================
  // DISLIKES
  // =======================================================

  getDislikes(article: KBArticle): number {
    if (typeof article.dislikes === 'number') {
      return article.dislikes;
    }

    if (typeof article.dislike_count === 'number') {
      return article.dislike_count;
    }

    return 0;
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
