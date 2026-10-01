
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  HttpClient
} from '@angular/common/http';

import {
  FormsModule
} from '@angular/forms';

import {
  environment
} from '../../../environments/environment';


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
}


// =========================================================
// COMPONENT
// =========================================================

@Component({
  selector: 'app-knowledge-base-edit',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './knowledge-base-edit.html',

  styleUrl: './knowledge-base-edit.css'
})


export class KnowledgeBaseEdit implements OnInit {


  // =======================================================
  // ARTICLE
  // =======================================================

  article: KBArticle | null = null;


  // =======================================================
  // FORM
  // =======================================================

  title = '';

  summary = '';

  content = '';

  category = '';

  tags = '';

  status = 'draft';


  // =======================================================
  // PAGE STATE
  // =======================================================

  loading = true;

  saving = false;

  errorMessage = '';

  successMessage = '';


  // =======================================================
  // API
  // =======================================================

  private apiUrl =
    `${environment.apiUrl}/kb/articles/`;


  // =======================================================
  // CONSTRUCTOR
  // =======================================================

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

    const articleId =
      this.route.snapshot.paramMap.get('id');


    console.log(
      'Edit Article ID:',
      articleId
    );


    if (!articleId) {

      this.loading = false;

      this.errorMessage =
        'Article ID not found.';

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

    const url =
      `${this.apiUrl}${articleId}/`;


    console.log(
      'Edit Article API URL:',
      url
    );


    this.http
      .get<KBArticle>(url)
      .subscribe({

        // ===================================================
        // SUCCESS
        // ===================================================

        next: (response) => {

          console.log(
            'Article loaded for editing:',
            response
          );


          this.article = response;


          // -----------------------------------------------
          // Populate form
          // -----------------------------------------------

          this.title =
            response.title || '';


          this.summary =
            response.summary || '';


          this.content =
            response.content || '';


          this.category =
            response.category || '';


          this.tags =
            this.convertTagsToString(
              response.tags
            );


          this.status =
            response.status || 'draft';


          this.loading = false;

          this.errorMessage = '';

          this.cdr.detectChanges();

        },


        // ===================================================
        // ERROR
        // ===================================================

        error: (error) => {

          console.error(
            'Load article error:',
            error
          );


          this.loading = false;


          if (error.status === 401) {

            this.errorMessage =
              'Authentication failed. Please login again.';

          }

          else if (error.status === 403) {

            this.errorMessage =
              'You do not have permission to edit this article.';

          }

          else if (error.status === 404) {

            this.errorMessage =
              'Knowledge Base article not found.';

          }

          else if (error.status === 0) {

            this.errorMessage =
              'Unable to connect to the Knowledge Base API.';

          }

          else {

            this.errorMessage =
              `Unable to load article. Error: ${error.status}`;

          }


          this.cdr.detectChanges();

        }

      });

  }


  // =======================================================
  // SAVE ARTICLE
  // =======================================================

  saveArticle(): void {

    if (
      !this.article ||
      this.saving
    ) {

      return;
    }


    // -----------------------------------------------
    // Basic validation
    // -----------------------------------------------

    if (!this.title.trim()) {

      this.errorMessage =
        'Title is required.';

      return;
    }


    if (!this.content.trim()) {

      this.errorMessage =
        'Content is required.';

      return;
    }


    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';


    const payload = {

      title: this.title.trim(),

      summary: this.summary.trim(),

      content: this.content,

      category: this.category.trim(),

      tags: this.convertStringToTags(
        this.tags
      ),

      status: this.status

    };


    const url =
      `${this.apiUrl}${this.article.id}/`;


    console.log(
      'Updating Knowledge Base Article:',
      payload
    );


    this.http
      .patch<any>(
        url,
        payload
      )
      .subscribe({

        // =================================================
        // SUCCESS
        // =================================================

        next: (response) => {

          console.log(
            'Article updated successfully:',
            response
          );


          this.saving = false;


          this.successMessage =
            'Article updated successfully.';


          this.cdr.detectChanges();


          // -----------------------------------------------
          // Go back to article details
          // -----------------------------------------------

          setTimeout(() => {

            this.router.navigate([
              '/knowledge-base',
              this.article?.id
            ]);

          }, 700);

        },


        // =================================================
        // ERROR
        // =================================================

        error: (error) => {

          console.error(
            'Update article error:',
            error
          );


          console.error(
            'Status:',
            error.status
          );


          console.error(
            'Error body:',
            error.error
          );


          this.saving = false;


          this.errorMessage =
            error.error?.detail ||
            error.error?.message ||
            'Unable to update the article.';


          this.cdr.detectChanges();

        }

      });

  }


  // =======================================================
  // CANCEL
  // =======================================================

  cancelEdit(): void {

    if (!this.article) {

      this.router.navigate([
        '/knowledge-base'
      ]);

      return;
    }


    this.router.navigate([
      '/knowledge-base',
      this.article.id
    ]);

  }


  // =======================================================
  // CONVERT TAGS TO STRING
  // =======================================================

  convertTagsToString(
    tags: any
  ): string {

    if (!tags) {

      return '';
    }


    if (Array.isArray(tags)) {

      return tags.join(', ');

    }


    if (typeof tags === 'string') {

      return tags;

    }


    return '';

  }


  // =======================================================
  // CONVERT STRING TO TAGS
  // =======================================================

  convertStringToTags(
    tags: string
  ): string[] {

    if (!tags) {

      return [];
    }


    return tags
      .split(',')
      .map(
        tag => tag.trim()
      )
      .filter(
        tag => !!tag
      );

  }

}
