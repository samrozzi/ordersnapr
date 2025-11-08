import { useState } from "react";
import { TutorialStep } from "@/components/TutorialTooltip";

export function useTutorial(tutorialId: string) {
  const [isActive, setIsActive] = useState(false);

  const startTutorial = () => {
    setIsActive(true);
  };

  const skipTutorial = () => {
    setIsActive(false);
  };

  const restartTutorial = (userId: string) => {
    localStorage.removeItem(`tutorial_${tutorialId}_${userId}`);
    setIsActive(true);
  };

  return {
    isActive,
    startTutorial,
    skipTutorial,
    restartTutorial,
  };
}

// Predefined tutorials for common pages
export const DASHBOARD_TUTORIAL: TutorialStep[] = [
  {
    id: "welcome",
    target: "[data-tutorial='dashboard-stats']",
    title: "Welcome to Your Dashboard",
    content: "Here you'll see your key metrics at a glance - work orders, properties, and recent activity.",
    placement: "bottom",
  },
  {
    id: "quick-add",
    target: "[data-tutorial='quick-add']",
    title: "Quick Add Button",
    content: "Click here anytime to quickly create new work orders, properties, or other items.",
    placement: "left",
  },
  {
    id: "search",
    target: "[data-tutorial='global-search']",
    title: "Global Search",
    content: "Press Cmd+K (or Ctrl+K) to search across all your data instantly.",
    placement: "bottom",
  },
];

export const WORK_ORDERS_TUTORIAL: TutorialStep[] = [
  {
    id: "create-work-order",
    target: "[data-tutorial='create-work-order']",
    title: "Create Work Orders",
    content: "Click here to create a new work order. You can add details, assign it, and track progress.",
    placement: "bottom",
  },
  {
    id: "filters",
    target: "[data-tutorial='work-order-filters']",
    title: "Filter Work Orders",
    content: "Use these filters to quickly find work orders by status, priority, or assignee.",
    placement: "bottom",
  },
  {
    id: "export",
    target: "[data-tutorial='export-data']",
    title: "Export Data",
    content: "Export your work orders to CSV or Excel for reporting and analysis.",
    placement: "left",
  },
];

export const FORMS_TUTORIAL: TutorialStep[] = [
  {
    id: "create-form",
    target: "[data-tutorial='create-form']",
    title: "Create Custom Forms",
    content: "Build custom forms for inspections, checklists, surveys, and more.",
    placement: "bottom",
  },
  {
    id: "form-fields",
    target: "[data-tutorial='form-fields']",
    title: "Add Form Fields",
    content: "Choose from text, numbers, dates, checkboxes, file uploads, and more field types.",
    placement: "right",
  },
];
