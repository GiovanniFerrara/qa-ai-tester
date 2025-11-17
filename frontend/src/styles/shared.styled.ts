import styled from '@emotion/styled';
import { theme } from './theme';

export const Card = styled.div`
  background: ${theme.colors.cardBg};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
  box-shadow: ${theme.shadows.sm};
  transition: ${theme.transitions.fast};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }

  h2 {
    color: ${theme.colors.primary};
    margin-bottom: ${theme.spacing.lg};
    font-size: ${theme.fontSizes['3xl']};
  }

  h3 {
    color: ${theme.colors.text};
    margin-bottom: ${theme.spacing.md};
    font-size: ${theme.fontSizes['2xl']};
  }
`;

export const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger'; size?: 'small' | 'normal' }>`
  background: ${props => 
    props.variant === 'secondary' ? theme.colors.button.secondary.bg :
    props.variant === 'danger' ? theme.colors.button.danger.bg :
    theme.colors.gradient};
  color: ${props => props.variant === 'secondary' ? theme.colors.button.secondary.text : 'white'};
  border: none;
  padding: ${props => props.size === 'small' ? '0.4rem 0.75rem' : '0.75rem 2rem'};
  border-radius: ${theme.borderRadius.md};
  font-size: ${props => props.size === 'small' ? theme.fontSizes.md : theme.fontSizes.lg};
  cursor: pointer;
  transition: ${theme.transitions.normal};
  font-weight: 500;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${props => 
      props.variant === 'secondary' ? 'none' :
      props.variant === 'danger' ? 'none' :
      theme.shadows.primaryHover};
    background: ${props =>
      props.variant === 'secondary' ? theme.colors.button.secondary.hover :
      props.variant === 'danger' ? theme.colors.button.danger.hover :
      undefined};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

export const Label = styled.label`
  display: block;
  margin-bottom: ${theme.spacing.sm};
  font-weight: 500;
  color: ${theme.colors.text};
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.lg};
  transition: ${theme.transitions.normal};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.lg};
  transition: ${theme.transitions.normal};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

export const Textarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.lg};
  min-height: 110px;
  resize: vertical;
  transition: ${theme.transitions.normal};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

export const StatusBadge = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: ${theme.borderRadius.xl};
  font-size: ${theme.fontSizes.base};
  font-weight: 500;
  
  ${props => {
    const statusColors = theme.colors.status[props.status as keyof typeof theme.colors.status];
    if (statusColors) {
      return `
        background: ${statusColors.bg};
        color: ${statusColors.text};
      `;
    }
    return '';
  }}
`;

export const Badge = styled.span<{ variant?: 'provider' | 'model' }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: ${theme.borderRadius.xl};
  font-size: ${theme.fontSizes.base};
  font-weight: 500;
  
  ${props => {
    if (props.variant === 'provider') {
      return `
        background: ${theme.colors.badge.provider.bg};
        color: ${theme.colors.badge.provider.text};
      `;
    }
    if (props.variant === 'model') {
      return `
        background: ${theme.colors.badge.model.bg};
        color: ${theme.colors.badge.model.text};
      `;
    }
    return '';
  }}
`;

export const ErrorMessage = styled.div`
  background: ${theme.colors.error.bg};
  color: ${theme.colors.error.text};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.lg};
  border-left: 4px solid ${theme.colors.error.border};
`;

export const SuccessBanner = styled.div`
  background: ${theme.colors.success.bg};
  color: ${theme.colors.success.text};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.lg};
`;

export const Loading = styled.div`
  text-align: center;
  padding: ${theme.spacing['3xl']};
  color: ${theme.colors.textSecondary};
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing['3xl']};
  color: ${theme.colors.textSecondary};

  h3 {
    color: ${theme.colors.text};
    margin-bottom: ${theme.spacing.lg};
  }
`;

export const SeverityBadge = styled.span<{ severity: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: ${theme.borderRadius.xl};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  text-transform: uppercase;
  
  ${props => {
    const color = theme.colors.severity[props.severity as keyof typeof theme.colors.severity];
    if (color) {
      return `
        background: ${color};
        color: #fff;
      `;
    }
    return '';
  }}
`;

export const SeverityPill = styled.span<{ severity: string }>`
  padding: 0.2rem 0.65rem;
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  color: white;
  flex-shrink: 0;
  
  ${props => {
    const color = theme.colors.severity[props.severity as keyof typeof theme.colors.severity];
    if (color) {
      return `background: ${color};`;
    }
    return '';
  }}
`;

export const LinkButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.primary};
  cursor: pointer;
  font-weight: 600;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
`;

export const IconButton = styled.button<{ $recording?: boolean }>`
  background: ${props => props.$recording ? '#fee' : 'none'};
  border: 2px solid ${props => props.$recording ? '#f44' : theme.colors.borderLight};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes['3xl']};
  cursor: pointer;
  transition: ${theme.transitions.fast};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  animation: ${props => props.$recording ? 'pulse 1.5s infinite' : 'none'};

  &:hover {
    background: ${props => props.$recording ? '#fee' : theme.colors.hoverDark};
    border-color: ${theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;