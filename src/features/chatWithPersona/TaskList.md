
# Chat with Persona Feature - Task List

## Overview
Building a feature that allows users to:
1. Select an audience
2. View and filter segments within that audience using a dropdown with segment cards
3. Select personas from those segments using filters (tag-like buttons)
4. Chat with the selected personas in a group chat interface with a two-pane layout

## Tasks

### 1. UI Structure & Navigation
- [x] Create basic layout with audience selection step
- [x] Implement navigation between audience selection and persona chat interface
- [x] Add collapsible dropdown for segment selection with filter cards
- [x] Design the two-pane layout (filtered personas on left, chat on right)

### 2. Audience & Segment Integration
- [x] Integrate audience selection from existing audiences
- [x] Fetch segments for selected audience
- [x] Create segment cards UI with tag filters in dropdown
- [x] Implement segment selection functionality

### 3. Persona Filtering & Selection
- [x] Implement filter controls for personas within segments
- [x] Create filtered persona API integration
- [x] Build selected personas panel UI on left side of chat
- [x] Add persona selection/deselection functionality

### 4. Chat Interface
- [x] Build message display area with proper styling
- [x] Add message input and send functionality
- [x] Implement simulated persona responses based on attributes
- [x] Style chat messages to show persona details

### 5. Performance Optimizations
- [x] Implement lazy loading for persona data
- [x] Add caching for already fetched personas
- [x] Optimize filter operations for better performance

## File Involvement
- `ChatWithPersona.tsx` - Main container and orchestration
- `PersonaSelector.card.tsx` - Segment display and persona filtering
- `ChatInterface.tsx` - Chat display and interaction logic
- `PersonaPanel.tsx` - (To be created) Selected personas display on left side

## Current Status
Working on implementing the two-pane layout and segment filtering functionality.
