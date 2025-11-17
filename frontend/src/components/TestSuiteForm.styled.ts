import styled from "@emotion/styled";
import { theme } from "../styles/theme";

export const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};
`;

export const Header = styled.div`
  margin-bottom: ${theme.spacing["2xl"]};
`;

export const Title = styled.h1`
  font-size: ${theme.fontSizes["3xl"]};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.sm} 0;
`;

export const Subtitle = styled.p`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

export const Form = styled.form`
  background: white;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing["2xl"]};
  box-shadow: ${theme.shadows.card};
`;

export const FormSection = styled.div`
  margin-bottom: ${theme.spacing["2xl"]};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const Label = styled.label`
  display: block;
  font-size: ${theme.fontSizes.base};
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm};
`;

export const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  border: 2px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.base};
  transition: ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: #9333ea;
    box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1);
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: ${theme.spacing.md};
  border: 2px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.base};
  font-family: inherit;
  min-height: 100px;
  resize: vertical;
  transition: ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: #9333ea;
    box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1);
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
  }
`;

export const HelpText = styled.span`
  display: block;
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textMuted};
  margin-top: ${theme.spacing.xs};
`;

export const ExecutionModeSelector = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.sm};
`;

export const ExecutionModeOption = styled.label<{ selected: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${theme.spacing.lg};
  border: 2px solid ${props => props.selected ? '#9333ea' : theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background: ${props => props.selected ? 'rgba(147, 51, 234, 0.05)' : 'white'};
  cursor: pointer;
  transition: ${theme.transitions.fast};

  &:hover {
    border-color: #9333ea;
    background: rgba(147, 51, 234, 0.05);
  }

  input {
    display: none;
  }
`;

export const ModeIcon = styled.div`
  font-size: ${theme.fontSizes["3xl"]};
  margin-bottom: ${theme.spacing.sm};
`;

export const ModeName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

export const ModeDescription = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  text-align: center;
`;

export const TaskSelector = styled.div`
  border: 2px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  max-height: 400px;
  overflow-y: auto;
`;

export const TaskOption = styled.label<{ selected: boolean }>`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border};
  cursor: pointer;
  transition: ${theme.transitions.fast};
  background: ${props => props.selected ? 'rgba(147, 51, 234, 0.05)' : 'white'};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(147, 51, 234, 0.05);
  }

  input[type="checkbox"] {
    margin-right: ${theme.spacing.md};
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #9333ea;
  }
`;

export const TaskInfo = styled.div`
  flex: 1;
`;

export const TaskName = styled.div`
  font-size: ${theme.fontSizes.base};
  font-weight: 600;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

export const TaskDescription = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

export const EmptyTaskList = styled.div`
  padding: ${theme.spacing["2xl"]};
  text-align: center;
  color: ${theme.colors.textMuted};
`;

export const SelectedCount = styled.div`
  margin-top: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  font-weight: 600;
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${theme.spacing["2xl"]};
  padding-top: ${theme.spacing.xl};
  border-top: 1px solid ${theme.colors.border};
`;

export const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${theme.spacing.md} ${theme.spacing["2xl"]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.base};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transitions.fast};
  border: none;

  ${props => {
    if (props.variant === 'primary') {
      return `
        background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
        color: white;
        &:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
          transform: translateY(-2px);
        }
      `;
    }
    return `
      background: ${theme.colors.button.secondary.bg};
      color: ${theme.colors.button.secondary.text};
      &:hover:not(:disabled) {
        background: ${theme.colors.button.secondary.hover};
      }
    `;
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

export const ErrorMessage = styled.div`
  background: ${theme.colors.error.bg};
  border: 1px solid ${theme.colors.error.border};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
  color: ${theme.colors.error.text};
  font-size: ${theme.fontSizes.base};
`;

export const LoadingMessage = styled.div`
  text-align: center;
  padding: ${theme.spacing["3xl"]};
  font-size: ${theme.fontSizes.lg};
  color: ${theme.colors.textSecondary};
`;