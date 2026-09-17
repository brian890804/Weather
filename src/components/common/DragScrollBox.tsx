import React, { useRef, useState, useCallback } from 'react';
import Box, { BoxProps } from '@mui/material/Box';

interface DragScrollBoxProps extends BoxProps {
  children: React.ReactNode;
}

/**
 * 支援滑鼠按住左右拖曳（左右拖動）、觸控手勢滑動與滾輪的水平滾動容器
 */
export function DragScrollBox({ children, sx, ...rest }: DragScrollBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({
    startX: 0,
    scrollLeft: 0,
    isDown: false,
    hasDragged: false,
  });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // 僅支援滑鼠左鍵拖曳
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    dragState.current = {
      startX: e.pageX - container.offsetLeft,
      scrollLeft: container.scrollLeft,
      isDown: true,
      hasDragged: false,
    };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current.isDown) return;
    const container = containerRef.current;
    if (!container) return;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.5; // 加速平滑係數
    if (Math.abs(walk) > 6) {
      dragState.current.hasDragged = true;
      if (!isDragging) setIsDragging(true);
    }
    container.scrollLeft = dragState.current.scrollLeft - walk;
  }, [isDragging]);

  const onMouseUp = useCallback(() => {
    dragState.current.isDown = false;
    setIsDragging(false);
  }, []);

  const onMouseLeave = useCallback(() => {
    dragState.current.isDown = false;
    setIsDragging(false);
  }, []);

  // 當使用者是在拖曳而非點擊時，攔截子元件的 onClick 事件，避免誤選卡片
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragState.current.hasDragged) {
      e.stopPropagation();
      e.preventDefault();
      dragState.current.hasDragged = false;
    }
  }, []);

  return (
    <Box
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onClickCapture={onClickCapture}
      sx={{
        display: 'flex',
        gap: { xs: 1.5, sm: 2 },
        overflowX: 'auto',
        overflowY: 'visible',
        py: 1,
        mx: -0.5,
        px: 0.5,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: isDragging ? 'none' : 'auto',
        WebkitOverflowScrolling: 'touch',
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-track': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)' },
        '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)' },
        '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'rgba(255,255,255,0.35)' },
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

export default React.memo(DragScrollBox);
