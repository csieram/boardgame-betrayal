import React from 'react';
import { render, screen } from '@testing-library/react';
import { PlayerTokenGroup } from './PlayerToken';
import { AIPawnGroup } from './AIPawn';
import { Character } from '@betrayal/shared';
import { AIPersonality } from '@betrayal/game-engine';

// Mock characters for testing
const mockCharacters: Character[] = [
  {
    id: 'char1',
    name: 'Test Character 1',
    nameEn: 'Test Character 1',
    emoji: '👤',
    age: 25,
    description: 'Test character 1',
    color: '#FF0000',
    portraitSvg: '/test1.svg',
    stats: {
      speed: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 2 },
      might: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 3 },
      sanity: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 2 },
      knowledge: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 2 },
    },
  },
  {
    id: 'char2',
    name: 'Test Character 2',
    nameEn: 'Test Character 2',
    emoji: '👤',
    age: 25,
    description: 'Test character 2',
    color: '#00FF00',
    portraitSvg: '/test2.svg',
    stats: {
      speed: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 3 },
      might: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 2 },
      sanity: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 3 },
      knowledge: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 2 },
    },
  },
  {
    id: 'char3',
    name: 'Test Character 3',
    nameEn: 'Test Character 3',
    emoji: '👤',
    age: 25,
    description: 'Test character 3',
    color: '#0000FF',
    portraitSvg: '/test3.svg',
    stats: {
      speed: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 2 },
      might: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 2 },
      sanity: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 4 },
      knowledge: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 3 },
    },
  },
  {
    id: 'char4',
    name: 'Test Character 4',
    nameEn: 'Test Character 4',
    emoji: '👤',
    age: 25,
    description: 'Test character 4',
    color: '#FFFF00',
    portraitSvg: '/test4.svg',
    stats: {
      speed: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 4 },
      might: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 2 },
      sanity: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 2 },
      knowledge: { values: [1, 2, 3, 4, 5, 6, 7, 8], currentIndex: 2 },
    },
  },
];

const mockAIPlayers = [
  { id: 'ai1', character: mockCharacters[0], personality: 'explorer' as AIPersonality, name: 'AI 1' },
  { id: 'ai2', character: mockCharacters[1], personality: 'aggressive' as AIPersonality, name: 'AI 2' },
  { id: 'ai3', character: mockCharacters[2], personality: 'cautious' as AIPersonality, name: 'AI 3' },
];

describe('Issue #126: Character Overlap Fix', () => {
  describe('PlayerTokenGroup', () => {
    it('renders single character without overlap', () => {
      const { container } = render(
        <PlayerTokenGroup characters={[mockCharacters[0]]} />
      );
      
      // Should use flex layout
      const groupContainer = container.firstChild;
      expect(groupContainer).toHaveClass('flex');
    });

    it('renders 2 characters side by side', () => {
      const { container } = render(
        <PlayerTokenGroup characters={mockCharacters.slice(0, 2)} />
      );
      
      const groupContainer = container.firstChild;
      expect(groupContainer).toHaveClass('flex');
      expect(groupContainer).toHaveClass('-space-x-2');
    });

    it('renders 3 characters with compact spacing', () => {
      const { container } = render(
        <PlayerTokenGroup characters={mockCharacters.slice(0, 3)} />
      );
      
      const groupContainer = container.firstChild;
      expect(groupContainer).toHaveClass('flex');
      expect(groupContainer).toHaveClass('-space-x-3');
    });

    it('renders 4+ characters with smallest spacing', () => {
      const { container } = render(
        <PlayerTokenGroup characters={mockCharacters} />
      );
      
      const groupContainer = container.firstChild;
      expect(groupContainer).toHaveClass('flex');
      expect(groupContainer).toHaveClass('-space-x-4');
    });

    it('shows +N indicator when exceeding maxDisplay', () => {
      render(
        <PlayerTokenGroup characters={mockCharacters} maxDisplay={2} />
      );
      
      // Should show +2 for remaining characters
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('AIPawnGroup', () => {
    it('renders single AI without overlap', () => {
      const { container } = render(
        <AIPawnGroup aiPlayers={[mockAIPlayers[0]]} />
      );
      
      const groupContainer = container.firstChild;
      expect(groupContainer).toHaveClass('flex');
    });

    it('renders 2 AIs side by side', () => {
      const { container } = render(
        <AIPawnGroup aiPlayers={mockAIPlayers.slice(0, 2)} />
      );
      
      const groupContainer = container.firstChild;
      expect(groupContainer).toHaveClass('flex');
      expect(groupContainer).toHaveClass('-space-x-2');
    });

    it('renders 3 AIs with compact spacing', () => {
      const { container } = render(
        <AIPawnGroup aiPlayers={mockAIPlayers} />
      );
      
      const groupContainer = container.firstChild;
      expect(groupContainer).toHaveClass('flex');
      expect(groupContainer).toHaveClass('-space-x-3');
    });

    it('shows +N indicator when exceeding maxDisplay', () => {
      const manyAIPlayers = [...mockAIPlayers, ...mockAIPlayers]; // 6 AIs
      render(
        <AIPawnGroup aiPlayers={manyAIPlayers} maxDisplay={3} />
      );
      
      // Should show +3 for remaining AIs
      expect(screen.getByText('+3')).toBeInTheDocument();
    });
  });
});
