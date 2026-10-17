import React from 'react';
import { Chip, ChipProps } from '@mui/material';

type StatusVariant =
  | 'completed'
  | 'approved'
  | 'connected'
  | 'active'
  | 'scheduled'
  | 'sending'
  | 'running'
  | 'draft'
  | 'pending'
  | 'failed'
  | 'rejected'
  | 'disconnected'
  | 'paused';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const normalized = status.toLowerCase() as StatusVariant;

  let color: ChipProps['color'] = 'default';
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  switch (normalized) {
    case 'completed':
    case 'approved':
    case 'connected':
    case 'active':
      color = 'success';
      break;
    case 'scheduled':
    case 'sending':
    case 'running':
      color = 'info';
      break;
    case 'draft':
    case 'pending':
    case 'paused':
      color = 'warning';
      break;
    case 'failed':
    case 'rejected':
    case 'disconnected':
      color = 'error';
      break;
    default:
      color = 'default';
  }

  return (
    <Chip
      size={size}
      label={label}
      color={color}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        textTransform: 'capitalize',
      }}
    />
  );
};
