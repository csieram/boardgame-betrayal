'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@betrayal/shared';
import { X, Sparkles } from 'lucide-react';

// ==================== 類型定義 ====================

/**
 * 事件選擇選項
 */
export interface EventChoice {
  /** 選項唯一ID */
  id: string;
  /** 選項標籤（顯示文字） */
  label: string;
  /** 選項描述（說明效果） */
  description?: string;
  /** 選項圖示 */
  icon?: string;
  /** 是否需要檢定 */
  requiresRoll?: boolean;
  /** 檢定屬性類型 */
  rollStat?: 'speed' | 'might' | 'sanity' | 'knowledge';
  /** 檢定目標值 */
  rollTarget?: number;
}

/**
 * 事件選擇對話框屬性
 */
interface EventChoiceDialogProps {
  /** 是否顯示對話框 */
  isOpen: boolean;
  /** 關閉對話框的回調 */
  onClose: () => void;
  /** 事件卡牌 */
  eventCard: Card | null;
  /** 選項列表 */
  choices: EventChoice[];
  /** 選擇選項後的回調 */
  onSelect: (choiceId: string) => void;
}

// ==================== 組件 ====================

/**
 * 事件選擇對話框組件
 * 
 * 用於顯示需要玩家做出選擇的事件卡
 * 例如："A Vial of Dust" 讓玩家選擇觸發作祟或獲得理智
 * 
 * Issue #271: Event Choice Dialog
 * 
 * @example
 * <EventChoiceDialog
 *   isOpen={showChoiceDialog}
 *   onClose={() => setShowChoiceDialog(false)}
 *   eventCard={currentEventCard}
 *   choices={[
 *     { id: 'trigger_haunt', label: '觸發作祟', description: '進行作祟檢定', icon: '👻' },
 *     { id: 'gain_sanity', label: '獲得理智', description: '獲得 1 點理智', icon: '🧠' }
 *   ]}
 *   onSelect={(choiceId) => handleEventChoice(choiceId)}
 * />
 */
export function EventChoiceDialog({
  isOpen,
  onClose,
  eventCard,
  choices,
  onSelect,
}: EventChoiceDialogProps) {
  // ESC 鍵關閉
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // 處理選擇
  const handleSelect = (choiceId: string) => {
    onSelect(choiceId);
  };

  // 如果沒有卡牌，不顯示
  if (!eventCard) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg max-h-[85vh] flex flex-col"
          >
            {/* 主容器 */}
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/20 overflow-hidden flex flex-col">
              {/* 頂部裝飾 */}
              <div className="h-2 bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 flex-shrink-0" />
              
              {/* 內容區域 - scrollable */}
              <div className="p-6 overflow-y-auto">
                {/* 標題和卡牌資訊 */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-6"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                    <Sparkles className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    做出選擇
                  </h2>
                  <p className="text-emerald-300 text-lg">
                    {eventCard.name}
                  </p>
                </motion.div>

                {/* 卡牌描述 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-black/20 rounded-xl p-4 mb-6 border border-white/10"
                >
                  <p className="text-white/90 text-center">{eventCard.description}</p>
                </motion.div>

                {/* 效果描述（如果有） */}
                {eventCard.effect && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-emerald-900/30 rounded-xl p-4 mb-6 border border-emerald-500/30"
                  >
                    <p className="text-emerald-300 text-sm text-center">
                      <span className="text-emerald-400 font-bold">效果：</span>
                      {eventCard.effect}
                    </p>
                  </motion.div>
                )}

                {/* 選擇提示 */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-gray-400 text-center mb-4 text-sm"
                >
                  請選擇一個選項：
                </motion.p>

                {/* 選項列表 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-3"
                >
                  {choices.map((choice, index) => (
                    <ChoiceButton
                      key={choice.id}
                      choice={choice}
                      index={index}
                      onClick={() => handleSelect(choice.id)}
                    />
                  ))}
                </motion.div>
              </div>

              {/* 底部裝飾 */}
              <div className="h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent flex-shrink-0" />
            </div>

            {/* 背景光效 */}
            <div className="absolute -inset-4 bg-emerald-500/10 rounded-3xl blur-2xl -z-10" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==================== 子組件 ====================

interface ChoiceButtonProps {
  choice: EventChoice;
  index: number;
  onClick: () => void;
}

/**
 * 選項按鈕組件
 */
function ChoiceButton({ choice, index, onClick }: ChoiceButtonProps) {
  // 預設圖示
  const defaultIcons = ['🎯', '✨', '🎲', '🔮', '⚡', '🛡️'];
  const icon = choice.icon || defaultIcons[index % defaultIcons.length];

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.1 }}
      whileHover={{ scale: 1.02, x: 5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="
        w-full p-4 rounded-xl border-2 border-emerald-500/30
        bg-gradient-to-r from-emerald-900/40 to-gray-800/40
        hover:border-emerald-500/60 hover:from-emerald-900/60 hover:to-gray-800/60
        transition-all duration-200 text-left group
        shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/15
      "
    >
      <div className="flex items-center gap-4">
        {/* 圖示 */}
        <div className="
          w-12 h-12 rounded-xl bg-emerald-500/20 
          flex items-center justify-center text-2xl
          group-hover:bg-emerald-500/30 group-hover:scale-110
          transition-all duration-200
        ">
          {icon}
        </div>

        {/* 文字內容 */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-lg group-hover:text-emerald-300 transition-colors">
            {choice.label}
          </p>
          {choice.description && (
            <p className="text-gray-400 text-sm mt-1 group-hover:text-gray-300 transition-colors">
              {choice.description}
            </p>
          )}
          {choice.requiresRoll && choice.rollStat && (
            <p className="text-emerald-400/70 text-xs mt-2 flex items-center gap-1">
              <span>🎲</span>
              需要{getStatName(choice.rollStat)}檢定 
              {choice.rollTarget !== undefined && `(目標 ≥ ${choice.rollTarget})`}
            </p>
          )}
        </div>

        {/* 箭頭指示 */}
        <motion.div
          className="text-emerald-500/50 group-hover:text-emerald-400 transition-colors"
          initial={{ x: 0 }}
          whileHover={{ x: 5 }}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.div>
      </div>
    </motion.button>
  );
}

// ==================== 工具函數 ====================

/**
 * 取得屬性中文名稱
 */
function getStatName(stat: string): string {
  const names: Record<string, string> = {
    speed: '速度',
    might: '力量',
    sanity: '理智',
    knowledge: '知識',
  };
  return names[stat] || stat;
}

export default EventChoiceDialog;
