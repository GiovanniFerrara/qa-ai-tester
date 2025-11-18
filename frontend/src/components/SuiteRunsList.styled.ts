import styled from '@emotion/styled';
import { theme } from '../styles/theme';

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

export const Header = styled.header`
  margin-bottom: ${theme.spacing.xl};
`;

export const HeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const BackButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.primary};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
  padding: ${theme.spacing.sm};
  margin-left: -${theme.spacing.sm};
  transition: ${theme.transitions.normal};
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  &:hover {
    color: ${theme.colors.primaryDark};
    transform: translateX(-4px);
  }
`;

export const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${theme.spacing.lg};
  flex-wrap: wrap;
`;

export const Title = styled.h1`
  font-size: ${theme.fontSizes['3xl']};
  font-weight: 700;
  color: ${theme.colors.text};
  margin: 0;
`;

export const Subtitle = styled.p`
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: center;
  flex-wrap: wrap;
`;

export const ActionButton = styled.button<{ variant?: 'danger' }>`
  background: ${props => props.variant === 'danger' ? theme.colors.error.text : theme.colors.primary};
  color: white;
  border: none;
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.base};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transitions.normal};
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${props => props.variant === 'danger' ? '#a01c24' : theme.colors.primaryDark};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const HeaderMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const EnvTag = styled.div<{ muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.borderLight};
  color: ${props => (props.muted ? theme.colors.textSecondary : theme.colors.primary)};
  border: 1px solid ${props => (props.muted ? theme.colors.border : 'rgba(14, 165, 233, 0.4)')};
  font-size: ${theme.fontSizes.sm};
  code {
    font-family: ${theme.fonts.mono};
    font-size: ${theme.fontSizes.sm};
  }
`;

export const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  font-size: ${theme.fontSizes.xl};
  color: ${theme.colors.textSecondary};
`;

export const ErrorState = styled.div`
  background: ${theme.colors.error.bg};
  border: 1px solid ${theme.colors.error.border};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  text-align: center;

  p {
    color: ${theme.colors.error.text};
    font-size: ${theme.fontSizes.lg};
    margin: 0 0 ${theme.spacing.lg} 0;
  }

  button {
    background: ${theme.colors.error.text};
    color: white;
    border: none;
    padding: ${theme.spacing.md} ${theme.spacing.xl};
    border-radius: ${theme.borderRadius.md};
    font-size: ${theme.fontSizes.base};
    cursor: pointer;
    transition: ${theme.transitions.normal};

    &:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
  }
`;

export const Card = styled.div`
  background: ${theme.colors.cardBg};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  box-shadow: ${theme.shadows.sm};
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};

  h3 {
    font-size: ${theme.fontSizes.xl};
    margin: 0 0 ${theme.spacing.md} 0;
    color: ${theme.colors.text};
  }

  p {
    font-size: ${theme.fontSizes.base};
    margin: 0 0 ${theme.spacing.xl} 0;
  }
`;

export const RunButton = styled.button`
  background: ${theme.colors.primary};
  color: white;
  border: none;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.base};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transitions.normal};
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  &:hover:not(:disabled) {
    background: ${theme.colors.primaryDark};
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const RunsListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const RunCard = styled.div`
  background: ${theme.colors.cardBg};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  box-shadow: ${theme.shadows.sm};
  cursor: pointer;
  transition: ${theme.transitions.normal};

  &:hover {
    transform: translateX(4px);
    box-shadow: ${theme.shadows.md};
  }
`;

export const RunHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${theme.spacing.lg};
  gap: ${theme.spacing.lg};
`;

export const RunInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

export const RunId = styled.span`
  font-family: ${theme.fonts.mono};
  color: ${theme.colors.primary};
  font-weight: 600;
  font-size: ${theme.fontSizes.lg};
`;

export const RunTimestamp = styled.span`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;

export const StatusBadge = styled.div<{ status: string }>`
  display: inline-flex;
  align-items: center;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  white-space: nowrap;
  
  ${({ status }) => {
    const colors = theme.colors.status[status as keyof typeof theme.colors.status];
    if (colors) {
      return `
        background: ${colors.bg};
        color: ${colors.text};
      `;
    }
    return `
      background: ${theme.colors.status.pending.bg};
      color: ${theme.colors.status.pending.text};
    `;
  }}
`;

export const RunMeta = styled.div`
  display: flex;
  gap: ${theme.spacing.xl};
  flex-wrap: wrap;
  margin-bottom: ${theme.spacing.md};
`;

export const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};

  strong {
    color: ${theme.colors.text};
  }
`;

export const ErrorText = styled.span`
  color: ${theme.colors.error.text};
  font-weight: 600;
`;

export const ProgressBarContainer = styled.div`
  width: 100%;
  height: 8px;
  background: ${theme.colors.borderLight};
  border-radius: ${theme.borderRadius.full};
  overflow: hidden;
`;

export const ProgressBar = styled.div<{ progress: number }>`
  height: 100%;
  width: ${props => props.progress}%;
  background: ${theme.colors.primary};
  transition: width 0.3s ease;
`;
