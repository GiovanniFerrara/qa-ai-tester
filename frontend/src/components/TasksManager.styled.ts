import styled from '@emotion/styled';
import { theme } from '../styles/theme';

export const TasksLayout = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.5rem;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

export const TasksSidebar = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (max-width: 960px) {
    order: 2;
  }
`;

export const TasksHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

export const TasksList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const TaskItem = styled.li<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.5rem;
  min-width: 300px;
  transition: border-color 0.2s, background 0.2s;

  ${props => props.$isActive && `
    border-color: ${theme.colors.primary};
    background: #f5f7ff;
  `}

  button:first-of-type {
    background: transparent;
    color: ${theme.colors.text};
    text-align: left;
    padding: 0.5rem;
    border: none;
    flex: 1;
    box-shadow: none;
    transform: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }
  }
`;

export const TaskName = styled.span`
  display: block;
  font-weight: 600;
`;

export const TaskRoute = styled.span`
  display: block;
  font-size: 0.85rem;
  color: ${theme.colors.textSecondary};
`;

export const TasksActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const TasksForm = styled.div`
  padding: 1.5rem;

  @media (max-width: 960px) {
    order: 1;
  }

  textarea,
  input,
  select {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid ${theme.colors.border};
    border-radius: 6px;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: ${theme.colors.primary};
    }
  }
`;

export const TaskFormGrid = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const FormGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;

export const Checkbox = styled.label`
  display: flex;
  align-items: center;
  padding: 8px 0;
  gap: 0.5rem;
  font-weight: 500;

  input {
    width: auto !important;
  }
`;

export const FieldHint = styled.p`
  padding: 0 0 16px 0;
  font-size: 0.9rem;
  color: ${theme.colors.textSecondary};

  code {
    background: ${theme.colors.borderLight};
    padding: 2px 6px;
    border-radius: 3px;
    font-family: ${theme.fonts.mono};
  }
`;

export const BudgetsFieldset = styled.fieldset`
  border: 1px solid ${theme.colors.border};
  padding: 1rem;
  border-radius: 6px;

  legend {
    padding: 0 0.5rem;
    color: ${theme.colors.primary};
    font-weight: 600;
  }
`;

export const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

export const AdvancedSettingsSection = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px dashed ${theme.colors.border};
`;

export const AdvancedToggle = styled.button`
  background: none;
  border: none;
  padding: 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.colors.primary};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 0.2s;
  margin-bottom: 1rem;
  box-shadow: none;
  transform: none;

  &:hover {
    color: #5568d3;
    transform: none;
    box-shadow: none;
  }
`;

export const AdvancedContent = styled.div`
  animation: slideDown 0.2s ease-out;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const TaskPreview = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  border: 1px dashed #cbd5f5;
  border-radius: 6px;
  background: #f8f9ff;

  p {
    margin-bottom: 0.5rem;
  }
`;