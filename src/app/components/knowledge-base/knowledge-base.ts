import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';


/* =========================
   KNOWLEDGE BASE ARTICLE
   ========================= */

interface KBArticle {

  id: number;

  title: string;

  content: string;

  summary: string;

  category: string;

  tags: any;

  status: string;

  published_at?: string | null;

  created_by?: any;

  updated_by?: any;

  created_at?: string;

  updated_at?: string;

  slug?: string;

  rendered_content?: string;

  /*
   * Optional fields used by the
   * Knowledge Base card footer.
   */
  likes?: number;

  dislikes?: number;

  like_count?: number;

  dislike_count?: number;
}


/* =========================
   COMPONENT
   ========================= */

@Component({
  selector: 'app-knowledge-base',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './knowledge-base.html',

  styleUrl: './knowledge-base.css'
})


export class KnowledgeBase implements OnInit {


  /* =========================
     API
     ========================= */

  private apiUrl =
    `${environment.apiUrl}/kb/articles/`;


  /* =========================
     DATA
     ========================= */

  articles: KBArticle[] = [];


  /* =========================
     PAGE STATE
     ========================= */

  loading = true;

  errorMessage = '';


  /* =========================
     SEARCH
     ========================= */

  searchText = '';

  /*
   * These are kept so your existing
   * filtering logic is not broken.
   * They are no longer displayed
   * in the UI.
   */
  selectedCategory = 'All';

  selectedStatus = 'All';


  /* =========================
     CONSTRUCTOR
     ========================= */

  constructor(
    private http: HttpClient,

    private cdr: ChangeDetectorRef,
    
    private router: Router
  ) {}


  /* =========================
     INIT
     ========================= */

  ngOnInit(): void {

    this.loadArticles();

  }


  /* =========================
     LOAD ARTICLES
     ========================= */

  loadArticles(): void {

    this.loading = true;

    this.errorMessage = '';


    const url =
      `${environment.apiUrl}/kb/articles/`;


    console.log(
      'Knowledge Base API URL:',
      url
    );


    this.http.get<any>(url).subscribe({

      /* =========================
         SUCCESS
         ========================= */

      next: (response) => {

        console.log(
          'Knowledge Base API Response:',
          response
        );


        if (Array.isArray(response)) {

          this.articles = response;

        }

        else if (
          response?.results &&
          Array.isArray(response.results)
        ) {

          this.articles =
            response.results;

        }

        else {

          this.articles = [];

          this.errorMessage =
            'Invalid Knowledge Base response.';
        }


        this.loading = false;

        this.cdr.detectChanges();

      },


      /* =========================
         ERROR
         ========================= */

      error: (error) => {

        console.error(
          'Knowledge Base API Error:',
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


        console.error(
          'URL:',
          error.url
        );


        this.loading = false;


        if (error.status === 401) {

          this.errorMessage =
            'Authentication failed. Please login again.';

        }

        else if (error.status === 403) {

          this.errorMessage =
            'You do not have permission to view Knowledge Base articles.';

        }

        else if (error.status === 404) {

          this.errorMessage =
            'Knowledge Base API endpoint was not found.';

        }

        else if (error.status === 0) {

          this.errorMessage =
            'Unable to connect to the Knowledge Base API.';

        }

        else {

          this.errorMessage =
            `Unable to load Knowledge Base articles. Error: ${error.status}`;

        }


        this.cdr.detectChanges();

      }

    });

  }


  /* =========================
     FILTERED ARTICLES
     ========================= */

  get filteredArticles(): KBArticle[] {

    let result =
      [...this.articles];


    const search =
      this.searchText
        .trim()
        .toLowerCase();


    if (search) {

      result =
        result.filter(article => {

          const title =
            article.title?.toLowerCase() || '';


          const summary =
            article.summary?.toLowerCase() || '';


          const content =
            article.content?.toLowerCase() || '';


          const category =
            article.category?.toLowerCase() || '';


          const slug =
            article.slug?.toLowerCase() || '';


          return (

            title.includes(search) ||

            summary.includes(search) ||

            content.includes(search) ||

            category.includes(search) ||

            slug.includes(search)

          );

        });

    }


    /*
     * These filters are retained for
     * existing functionality.
     */

    if (this.selectedCategory !== 'All') {

      result =
        result.filter(
          article =>
            article.category ===
            this.selectedCategory
        );

    }


    if (this.selectedStatus !== 'All') {

      result =
        result.filter(
          article =>
            article.status ===
            this.selectedStatus
        );

    }


    return result;

  }


  /* =========================
     CATEGORIES
     ========================= */

  get categories(): string[] {

    const values =
      this.articles

        .map(
          article =>
            article.category
        )

        .filter(
          category =>
            !!category
        );


    return [
      ...new Set(values)
    ];

  }


  /* =========================
     TAGS
     ========================= */

  getTags(
    article: KBArticle
  ): string[] {

    if (!article.tags) {

      return [];

    }


    if (Array.isArray(article.tags)) {

      return article.tags;

    }


    if (
      typeof article.tags === 'string'
    ) {

      return article.tags

        .split(',')

        .map(
          tag =>
            tag.trim()
        )

        .filter(
          tag =>
            !!tag
        );

    }


    return [];

  }


  /* =========================
     STATUS
     ========================= */

  formatStatus(
    status: string
  ): string {

    if (!status) {

      return '';

    }


    return status

      .replace(
        /_/g,
        ' '
      )

      .replace(
        /\b\w/g,
        char =>
          char.toUpperCase()
      );

  }


  /* =========================
     DATE
     ========================= */

  formatDate(
    date:
      string |
      null |
      undefined
  ): string {

    if (!date) {

      return '—';

    }


    const parsedDate =
      new Date(date);


    if (
      isNaN(
        parsedDate.getTime()
      )
    ) {

      return '—';

    }


    return parsedDate.toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',

        month: 'numeric',

        year: 'numeric'
      }
    );

  }


  /* =========================
     LIKES
     ========================= */

  getLikes(
    article: KBArticle
  ): number {

    if (
      typeof article.likes ===
      'number'
    ) {

      return article.likes;

    }


    if (
      typeof article.like_count ===
      'number'
    ) {

      return article.like_count;

    }


    return 0;

  }


  /* =========================
     DISLIKES
     ========================= */

  getDislikes(
    article: KBArticle
  ): number {

    if (
      typeof article.dislikes ===
      'number'
    ) {

      return article.dislikes;

    }


    if (
      typeof article.dislike_count ===
      'number'
    ) {

      return article.dislike_count;

    }


    return 0;

  }


  /* =========================
     AUTHOR
     ========================= */

  getAuthor(
    article: KBArticle
  ): string {

    const author =
      article.created_by;


    if (!author) {

      return 'admin';

    }


    if (
      typeof author === 'string'
    ) {

      return author;

    }


    if (
      typeof author === 'object'
    ) {

      return (

        author.username ||

        author.email ||

        author.name ||

        'admin'

      );

    }


    return 'admin';

  }


  /* =========================
     CLEAR FILTERS
     ========================= */

  clearFilters(): void {

    this.searchText = '';

    this.selectedCategory = 'All';

    this.selectedStatus = 'All';

  }


  /* =========================
     TRACK BY
     ========================= */

trackByArticle(
  index: number,
  article: KBArticle
): number {
  return article.id;
}

openArticle(articleId: number): void {
  this.router.navigate(['/knowledge-base', articleId]);
}

}
