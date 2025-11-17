import styled from '@emotion/styled';
import { theme } from '../styles/theme';

export const TaskPreview = styled.div`
  margin-top: ${theme.spacing.xl};
  padding: ${theme.spacing.lg};
  border: 1px dashed ${theme.colors.borderLight};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.accent};

  p {
    margin-bottom: ${theme.spacing.sm};
  }
`;

export const Hint = styled.small`
  display: block;
  margin-top: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.md};
  color: ${theme.colors.textSecondary};
`;