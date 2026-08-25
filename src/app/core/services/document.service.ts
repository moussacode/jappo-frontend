import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { DocumentGenere, TypeDocument } from '../models/document-genere.model';
import { MOCK_DOCUMENTS } from '../mocks/documents.mock';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private documents = [...MOCK_DOCUMENTS];

  getByEntrepreneur(entrepreneurId: string): Observable<DocumentGenere[]> {
    // TODO backend réel : this.http.get<DocumentGenere[]>(`/api/documents?entrepreneurId=${entrepreneurId}`)
    return of(this.documents.filter((d) => d.entrepreneurId === entrepreneurId)).pipe(delay(300));
  }

  getByType(entrepreneurId: string, type: TypeDocument): Observable<DocumentGenere | undefined> {
    return of(this.documents.find((d) => d.entrepreneurId === entrepreneurId && d.type === type)).pipe(delay(300));
  }

   updateContenu(documentId: string, contenu: unknown): Observable<DocumentGenere> {
    // TODO backend réel : this.http.patch<DocumentGenere>(`/api/documents/${documentId}`, { contenu })
    const doc = this.documents.find((d) => d.id === documentId)!;
    doc.contenu = contenu;
    doc.dateDerniereModif = new Date().toISOString();
    return of(doc).pipe(delay(300));
  }
}