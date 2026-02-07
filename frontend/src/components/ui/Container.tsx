import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ContainerProps {
    children: React.ReactNode;
    className?: string;
    as?: React.ElementType;
}

export function Container({ children, className, as: Component = 'div' }: ContainerProps) {
    return (
        <Component className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', className)}>
            {children}
        </Component>
    );
}
