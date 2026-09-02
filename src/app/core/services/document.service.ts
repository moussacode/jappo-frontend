import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { DocumentGenere, TypeDocument } from '../models/document-genere.model';
import { MOCK_DOCUMENTS } from '../mocks/documents.mock';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private documents = [...MOCK_DOCUMENTS];

  getByProjet(projetId: string): Observable<DocumentGenere[]> {
    // TODO backend réel : this.http.get<DocumentGenere[]>(`/api/documents?projetId=${projetId}`)
    return of(this.documents.filter((d) => d.projetId === projetId)).pipe(delay(300));
  }

  getByType(projetId: string, type: TypeDocument): Observable<DocumentGenere | undefined> {
    return of(this.documents.find((d) => d.projetId === projetId && d.type === type)).pipe(delay(300));
  }

  updateContenu(documentId: string, contenu: unknown): Observable<DocumentGenere> {
    // TODO backend réel : this.http.patch<DocumentGenere>(`/api/documents/${documentId}`, { contenu })
    const doc = this.documents.find((d) => d.id === documentId)!;
    doc.contenu = contenu;
    doc.dateDerniereModif = new Date().toISOString();
    return of(doc).pipe(delay(300));
  }
}