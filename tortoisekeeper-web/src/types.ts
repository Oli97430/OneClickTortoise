export type Sex = 'MALE' | 'FEMALE' | 'UNKNOWN';

// Taxonomy information from OpenTreeOfLife
export interface Taxonomy {
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
}

export interface Tortoise {
  id: string;
  name: string;
  birthDate: string; // ISO string
  isBirthDateApproximate: boolean;
  species: string;
  sex: Sex;
  notes: string;
  facePhoto?: string; // base64 or url
  plastronPhoto?: string; // dessous
  carapacePhoto?: string; // dessus
  taxonomy?: Taxonomy;
}

export interface TortoisePhoto {
  id: string;
  tortoiseId: string;
  url: string;
  date: string; // ISO string
  isMain?: boolean;
}

export interface WeightEntry {
  id: string;
  tortoiseId: string;
  date: string; // ISO string
  weight: number;
  note?: string; // commentaire facultatif
}

export interface MeasurementEntry {
  id: string;
  tortoiseId: string;
  date: string; // ISO string
  length: number; // longueur en mm
  width: number; // largeur en mm
}

export type ReminderType = 'weighing' | 'measurement' | 'deworming' | 'vet' | 'hibernation' | 'custom';

export interface Reminder {
  id: string;
  tortoiseId: string; // '' = global
  type: ReminderType;
  label: string;
  dueDate: string; // ISO string
  done: boolean;
  recurringDays?: number; // interval en jours pour répétition
}

export type ClutchStatus = 'incubating' | 'hatched' | 'failed' | 'unknown';

export interface Clutch {
  id: string;
  tortoiseId: string;
  date: string;              // date de la ponte ISO string
  eggsCount: number;
  incubationTemp?: number;   // °C
  incubationHumidity?: number; // %
  expectedHatchDate?: string; // ISO string
  actualHatchDate?: string;   // ISO string
  hatchedCount?: number;      // nombre d'œufs éclos
  status: ClutchStatus;
  notes?: string;
}

export type VetRecordType = 'vaccine' | 'deworming' | 'disease' | 'visit' | 'parasite' | 'surgery' | 'custom';

export interface VetRecord {
  id: string;
  tortoiseId: string;
  type: VetRecordType;
  date: string; // ISO string
  title: string;
  description?: string;
  vetName?: string;
  nextDate?: string; // prochain rendez-vous ISO string
}
