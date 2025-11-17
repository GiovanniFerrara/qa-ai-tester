import styled from "@emotion/styled";
import { theme } from "../styles/theme";

export const Container = styled.div`
  background: ${theme.colors.cardBg};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing["2xl"]};
  box-shadow: ${theme.shadows.card};
`;

export const Loading = styled.div`
  text-align: center;
  padding: ${theme.spacing["2xl"]};
  color: ${theme.colors.textSecondary};
`;

export const ErrorContainer = styled.div`
  text-align: center;
  padding: ${theme.spacing["2xl"]};
`;

export const ErrorMessage = styled.div`
  color: ${theme.colors.error.text};
  background: ${theme.colors.error.bg};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.lg};
`;

export const RetryButton = styled.button`
  background: ${theme.colors.primary};
  color: white;
  border: none;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
  transition: ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.primaryDark};
    box-shadow: ${theme.shadows.primaryHover};
  }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing["3xl"]} ${theme.spacing["2xl"]};
  color: ${theme.colors.textSecondary};

  h3 {
    font-size: ${theme.fontSizes["2xl"]};
    margin-bottom: ${theme.spacing.lg};
    color: ${theme.colors.text};
  }

  p {
    font-size: ${theme.fontSizes.base};
    color: ${theme.colors.textMuted};
  }
`;

export const Header = styled.h2`
  font-size: ${theme.fontSizes["3xl"]};
  margin-bottom: ${theme.spacing.xl};
  color: ${theme.colors.text};
`;

export const TaskGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${theme.spacing.xl};
`;

export const TaskCard = styled.div<{ selected?: boolean }>`
  background: ${theme.colors.cardBg};
  border: 2px solid ${(props) => props.selected ? theme.colors.primary : theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  cursor: pointer;
  transition: ${theme.transitions.fast};
  box-shadow: ${theme.shadows.sm};

  &:hover {
    border-color: ${theme.colors.primary};
    box-shadow: ${theme.shadows.md};
    transform: translateY(-2px);
  }

  h3 {
    font-size: ${theme.fontSizes.xl};
    margin-bottom: ${theme.spacing.md};
    color: ${theme.colors.text};
  }

  p {
    font-size: ${theme.fontSizes.base};
    color: ${theme.colors.textSecondary};
    margin-bottom: ${theme.spacing.lg};
    line-height: 1.5;
  }
`;

export const TaskMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const Badge = styled.span<{ variant?: 'provider' | 'model' | 'auth' }>`
  display: inline-block;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: 500;
  
  ${(props) => {
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
    if (props.variant === 'auth') {
      return `
        background: ${theme.colors.success.bg};
        color: ${theme.colors.success.text};
      `;
    }
    return `
      background: ${theme.colors.accent};
      color: ${theme.colors.textSecondary};
    `;
  }}
`;