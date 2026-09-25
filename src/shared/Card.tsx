import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outline' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  className = '',
  style,
  ...props
}) => {
  const classes = ['ui-card', `ui-card-${variant}`, className].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} {...props}>
      {children}
    </div>
  );
};
