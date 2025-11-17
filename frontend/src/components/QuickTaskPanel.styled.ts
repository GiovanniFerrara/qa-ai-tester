import styled from '@emotion/styled';
import { theme } from '../styles/theme';

export const QuickTaskPanelWrapper = styled.div`
  border: 1px dashed ${theme.colors.borderLight};
  background: ${theme.colors.accent};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  margin-bottom: ${theme.spacing.xl};
`;

export const QuickTaskHeader = styled.div`
  h3 {
    margin-bottom: ${theme.spacing.sm};
  }

  p {
    font-size: ${theme.fontSizes.normal};
    color: ${theme.colors.textSecondary};
    margin-bottom: ${theme.spacing.md};
  }
`;

export const QuickTaskTextarea = styled.textarea`
  width: 100%;
  border: 2px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  padding: 0.75rem;
  font-size: ${theme.fontSizes.lg};
  min-height: 110px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

export const QuickTaskActions = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
  margin-top: ${theme.spacing.md};
`;

export const QuickTaskStatus = styled.div<{ $isRecording?: boolean }>`
  font-size: ${theme.fontSizes.md};
  color: ${props => props.$isRecording ? '#f44' : theme.colors.primary};
  margin-top: ${theme.spacing.sm};
  min-height: 1rem;
`;

export const QuickTaskHint = styled.div`
  font-size: ${theme.fontSizes.md};
  color: ${theme.colors.textSecondary};
  margin-top: ${theme.spacing.sm};
`;