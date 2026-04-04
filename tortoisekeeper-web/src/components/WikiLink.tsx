import React from 'react';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Tooltip, Link } from '@mui/material';

interface WikiLinkProps {
  label: string;
  url: string;
  preview?: string;
}

const WikiLink: React.FC<WikiLinkProps> = ({ label, url, preview }) => (
  <Tooltip title={<span>{preview || url} <OpenInNewIcon sx={{ fontSize: 16, ml: 0.5, verticalAlign: 'middle' }} /></span>} arrow>
    <Link href={url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {label}
      <OpenInNewIcon sx={{ fontSize: 16, ml: 0.5, verticalAlign: 'middle' }} />
    </Link>
  </Tooltip>
);

export default WikiLink;
