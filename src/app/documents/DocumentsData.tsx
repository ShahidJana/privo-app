/**
 * Documents Vault (data) — wires {@link DocumentsView} to the live document list:
 * groups by category, derives expiry status, and formats dates/filenames.
 *
 * Imports the hook from its source file (NOT the @features/documents barrel) to
 * keep Metro's bundler happy, and is mounted behind an error boundary in
 * DocumentsScreen so a data/native failure degrades to the empty vault.
 */
import React from 'react';
import { now } from '@lib/date';
import {
  useCreateDocument,
  useDocumentList,
} from '@features/documents/useDocuments';
import type {
  DocumentCategory,
  DocumentItem,
  DocumentType,
} from '@features/documents/documents.types';
import { pickImage, type PickSource } from '@core/files/filePicker';
import type { PickedFile } from '@core/files/fileStorage';
import type { TabKey } from '@ui/components/BottomNav';
import {
  DocumentsView,
  type DocItemVM,
  type DocSection,
  type NewDocumentInput,
  type Tone,
} from './DocumentsView';

const DAY_MS = 86_400_000;
const EXPIRY_WINDOW_DAYS = 30;

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

// Render categories in a stable order matching the design.
const CATEGORY_ORDER: DocumentCategory[] = ['personal', 'educational'];
const CATEGORY_META: Record<DocumentCategory, { title: string; icon: string }> = {
  personal: { title: 'Personal', icon: 'folder-shared' },
  educational: { title: 'Educational', icon: 'school' },
};

const TYPE_ICONS: Record<DocumentType, string> = {
  cnic: 'badge',
  degree: 'school',
  passport: 'book',
  license: 'directions-car',
  birth_cert: 'description',
  other: 'description',
};

function formatDate(ms: number): string {
  const d = new Date(ms);
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${day} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatMonthYear(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fileName(uri: string | null, docType: DocumentType | null): string {
  if (uri) {
    const clean = uri.split('?')[0].split('#')[0];
    const slash = clean.lastIndexOf('/');
    const name = slash >= 0 ? clean.slice(slash + 1) : clean;
    if (name) {
      return name;
    }
  }
  return docType ? docType.replace('_', ' ').toUpperCase() : 'NO FILE';
}

function toViewModel(doc: DocumentItem, nowMs: number): DocItemVM {
  const icon = doc.docType ? TYPE_ICONS[doc.docType] : 'description';
  const subtitle = fileName(doc.fileUri, doc.docType);

  let statusLabel: string;
  let statusTone: Exclude<Tone, 'normal'>;
  let dateLabel: string;
  let dateValue: string;
  let dateTone: Tone;

  if (doc.expiryDate == null) {
    statusLabel = 'LIFETIME';
    statusTone = 'ok';
    dateLabel = 'ADDED';
    dateValue = formatMonthYear(doc.createdAt);
    dateTone = 'normal';
  } else {
    const days = Math.ceil((doc.expiryDate - nowMs) / DAY_MS);
    if (days < 0) {
      statusLabel = 'EXPIRED';
      statusTone = 'danger';
    } else if (days <= EXPIRY_WINDOW_DAYS) {
      statusLabel = 'EXPIRING SOON';
      statusTone = 'danger';
    } else {
      statusLabel = 'VALID';
      statusTone = 'ok';
    }
    dateLabel = 'EXPIRY';
    dateValue = formatDate(doc.expiryDate);
    dateTone = statusTone;
  }

  return {
    id: doc.id,
    title: doc.title,
    subtitle,
    icon,
    statusLabel,
    statusTone,
    dateLabel,
    dateValue,
    dateTone,
  };
}

export default function DocumentsData({
  onTabPress,
}: {
  onTabPress: (tab: TabKey) => void;
}): React.JSX.Element {
  const documents = useDocumentList().data ?? [];
  const createDocument = useCreateDocument();
  const nowMs = now();

  const onPickFile = (source: PickSource): Promise<PickedFile | null> =>
    pickImage(source);

  const onCreate = (input: NewDocumentInput, file: PickedFile): void => {
    // 'YYYY-MM-DD' → UTC epoch ms; empty string means lifetime (no expiry).
    let expiryDate: number | undefined;
    if (input.expiry.length > 0) {
      const [y, m, d] = input.expiry.split('-').map(Number);
      expiryDate = Date.UTC(y, m - 1, d);
    }
    createDocument.mutate({
      input: {
        title: input.title,
        category: input.category,
        docType: input.docType,
        expiryDate,
      },
      file,
    });
  };

  const sections: DocSection[] = CATEGORY_ORDER.map(category => {
    const items = documents
      .filter(d => d.category === category)
      .map(d => toViewModel(d, nowMs));
    return {
      key: category,
      title: CATEGORY_META[category].title,
      icon: CATEGORY_META[category].icon,
      items,
    };
  }).filter(section => section.items.length > 0);

  return (
    <DocumentsView
      sections={sections}
      totalCount={documents.length}
      onTabPress={onTabPress}
      onPickFile={onPickFile}
      onCreate={onCreate}
      creating={createDocument.isPending}
    />
  );
}
