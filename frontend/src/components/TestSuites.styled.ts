import styled from "@emotion/styled";
import { theme } from "../styles/theme";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
`;

export const Title = styled.h1`
  font-size: ${theme.fontSizes["4xl"]};
  color: ${theme.colors.text};
  margin: 0;
`;

export const CreateButton = styled.button`
  background: ${theme.colors.gradient};
  color: white;
  border: none;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.base};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transitions.fast};
  box-shadow: ${theme.shadows.sm};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.primaryHover};
  }

  &:active {
    transform: translateY(0);
  }
`;

export const SuitesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: ${theme.spacing.xl};
`;

export const SuiteCard = styled.div`
  position: relative;
  background: ${theme.colors.cardBg};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  box-shadow: ${theme.shadows.card};
  cursor: pointer;
  transition: ${theme.transitions.normal};
  border: 2px solid transparent;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${theme.colors.gradient};
    border-radius: ${theme.borderRadius.lg} ${theme.borderRadius.lg} 0 0;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${theme.shadows.lg};
    border-color: ${theme.colors.primary};
  }
`;

export const SuiteHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${theme.spacing.lg};
`;

export const SuiteName = styled.h3`
  font-size: ${theme.fontSizes.xl};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.xs} 0;
  flex: 1;
`;

export const SuiteDescription = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0 0 ${theme.spacing.lg} 0;
  line-height: 1.5;
`;

export const SuiteMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
`;

export const Badge = styled.span<{ variant?: 'count' | 'mode' | 'date' | 'env' }>`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;

  ${props => {
    if (props.variant === 'count') {
      return `
        background: ${theme.colors.badge.model.bg};
        color: ${theme.colors.badge.model.text};
      `;
    }
    if (props.variant === 'mode') {
      return `
        background: ${theme.colors.badge.provider.bg};
        color: ${theme.colors.badge.provider.text};
      `;
    }
    if (props.variant === 'date') {
      return `
        background: ${theme.colors.accent};
        color: ${theme.colors.textMuted};
      `;
    }
    if (props.variant === 'env') {
      return `
        background: rgba(14, 165, 233, 0.12);
        color: ${theme.colors.primary};
        border: 1px solid rgba(14, 165, 233, 0.3);
      `;
    }
    return `
      background: ${theme.colors.accent};
      color: ${theme.colors.textSecondary};
    `;
  }}
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
`;

export const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  flex: 1;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transitions.fast};
  border: none;

  ${props => {
    if (props.variant === 'primary') {
      return `
        background: ${theme.colors.gradient};
        color: white;
        &:hover {
          box-shadow: ${theme.shadows.primaryHover};
        }
      `;
    }
    if (props.variant === 'danger') {
      return `
        background: ${theme.colors.error.bg};
        color: ${theme.colors.error.text};
        &:hover {
          background: ${theme.colors.button.danger.bg};
          color: white;
        }
      `;
    }
    return `
      background: ${theme.colors.button.secondary.bg};
      color: ${theme.colors.button.secondary.text};
      &:hover {
        background: ${theme.colors.button.secondary.hover};
      }
    `;
  }}
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing["3xl"]} ${theme.spacing["2xl"]};
  background: ${theme.colors.cardBg};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.card};

  h3 {
    font-size: ${theme.fontSizes["2xl"]};
    margin-bottom: ${theme.spacing.lg};
    color: ${theme.colors.text};
  }

  p {
    font-size: ${theme.fontSizes.base};
    color: ${theme.colors.textMuted};
    margin-bottom: ${theme.spacing.xl};
  }
`;

export const Loading = styled.div`
  text-align: center;
  padding: ${theme.spacing["3xl"]};
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
`;

export const ErrorContainer = styled.div`
  background: ${theme.colors.error.bg};
  border: 1px solid ${theme.colors.error.border};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.xl};
  text-align: center;

  p {
    color: ${theme.colors.error.text};
    margin-bottom: ${theme.spacing.lg};
  }
`;

export const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;
