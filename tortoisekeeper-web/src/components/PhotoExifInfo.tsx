import React from 'react';

export interface ExifData {
  date?: string;
  make?: string;
  model?: string;
  software?: string;
  gps?: string;
  [key: string]: any;
}

interface PhotoExifInfoProps {
  exif: ExifData;
}

const labels: Record<string, string> = {
  date: 'Date',
  make: 'Appareil',
  model: 'Modèle',
  software: 'Logiciel',
  gps: 'Lieu',
};

const PhotoExifInfo: React.FC<PhotoExifInfoProps> = ({ exif }) => {
  if (!exif || Object.keys(exif).length === 0) return null;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: '#5d4037', fontSize: 13 }}>
      {Object.entries(exif).map(([key, value]) =>
        value && labels[key] ? (
          <li key={key}><b>{labels[key]} :</b> {value}</li>
        ) : null
      )}
    </ul>
  );
};

export default PhotoExifInfo;
