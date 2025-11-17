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

export const RunSubtitle = styled.p`
  margin: ${theme.spacing.xs} 0 0 0;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.base};
`;

export const StatusBadge = styled.div<{ status: string }>`
  display: inline-flex;
  align-items: center;
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.base};
  font-weight: 600;
  white-space: nowrap;
  
  ${props => props.status === 'running' ? `
    background: ${theme.colors.status.running.bg};
    color: ${theme.colors.status.running.text};
  ` : `
    background: ${theme.colors.success.bg};
    color: ${theme.colors.success.text};
  `}
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

export const MetaCard = styled.div`
  background: ${theme.colors.cardBg};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  box-shadow: ${theme.shadows.sm};
  margin-bottom: ${theme.spacing.xl};
`;

export const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.xl};
`;

export const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};

  label {
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  span {
    font-size: ${theme.fontSizes.lg};
    color: ${theme.colors.text};
    font-weight: 500;
  }
`;

export const ProgressSection = styled.div`
  margin-top: ${theme.spacing.lg};
`;

export const ProgressBarContainer = styled.div`
  width: 100%;
  height: 12px;
  background: ${theme.colors.borderLight};
  border-radius: ${theme.borderRadius.full};
  overflow: hidden;
  margin-top: ${theme.spacing.md};
`;

export const ProgressBar = styled.div<{ progress: number }>`
  height: 100%;
  width: ${props => props.progress}%;
  background: ${theme.colors.primary};
  transition: width 0.3s ease;
`;

export const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};

  strong {
    color: ${theme.colors.text};
  }
`;

export const SectionTitle = styled.h2`
  font-size: ${theme.fontSizes['2xl']};
  font-weight: 600;
  color: ${theme.colors.text};
  margin: ${theme.spacing['2xl']} 0 ${theme.spacing.lg} 0;
`;

export const TaskRunsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const TaskRunCard = styled.div`
  background: ${theme.colors.cardBg};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  box-shadow: ${theme.shadows.sm};
  cursor: pointer;
  transition: ${theme.transitions.normal};
  border-left: 4px solid transparent;

  &:hover {
    transform: translateX(4px);
    box-shadow: ${theme.shadows.md};
  }

  &[data-status="completed"] {
    border-left-color: ${theme.colors.success.text};
  }

  &[data-status="failed"] {
    border-left-color: ${theme.colors.error.text};
  }

  &[data-status="running"] {
    border-left-color: ${theme.colors.status.running.text};
  }
`;

export const TaskRunHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.sm};
`;

export const TaskRunTitle = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: 600;
  color: ${theme.colors.text};
`;

export const TaskRunStatus = styled.div<{ status: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  white-space: nowrap;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return `
          background: ${theme.colors.success.bg};
          color: ${theme.colors.success.text};
        `;
      case 'failed':
        return `
          background: ${theme.colors.error.bg};
          color: ${theme.colors.error.text};
        `;
      case 'running':
        return `
          background: ${theme.colors.status.running.bg};
          color: ${theme.colors.status.running.text};
        `;
      default:
        return `
          background: ${theme.colors.status.pending.bg};
          color: ${theme.colors.status.pending.text};
        `;
    }
  }}
`;

export const TaskRunMeta = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  flex-wrap: wrap;

  span {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.xs};
  }
`;

export const TaskId = styled.span`
  font-family: ${theme.fonts.mono};
  color: ${theme.colors.primary};
  font-weight: 500;
`;

export const EmptyState = styled.div`
  background: ${theme.colors.cardBg};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing['2xl']};
  text-align: center;
  box-shadow: ${theme.shadows.sm};

  h3 {
    font-size: ${theme.fontSizes.xl};
    margin: 0 0 ${theme.spacing.md} 0;
    color: ${theme.colors.text};
  }

  p {
    font-size: ${theme.fontSizes.base};
    color: ${theme.colors.textSecondary};
    margin: 0;
  }
`;
