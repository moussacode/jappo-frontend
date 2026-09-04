import { Cohorte } from '../models/cohorte.model';

export const MOCK_COHORTES: Cohorte[] = [
  { id: 'coh-001', nom: 'Cohorte 1 — Retail', secteur: 'Retail', dateDemarrage: '2026-02-01', structureId: 'struct-001' },
  { id: 'coh-002', nom: 'Cohorte 2 — Agritech', secteur: 'Agritech', dateDemarrage: '2026-03-01', structureId: 'struct-001' },
  { id: 'coh-003', nom: 'Cohorte 3 — Fintech', secteur: 'Fintech', dateDemarrage: '2026-03-03', structureId: 'struct-001' },
  { id: 'coh-004', nom: 'Cohorte 4 — Santé & EdTech', secteur: 'Santé & EdTech', dateDemarrage: '2026-05-01', structureId: 'struct-001' },
];