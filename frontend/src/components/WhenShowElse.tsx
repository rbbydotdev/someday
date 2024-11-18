import React from "react";

export function Else({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function Show({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function When({
  condition,
  children,
}: {
  condition: boolean;
  children: React.ReactNode;
}) {
  if (condition) {
    const showComponent = React.Children.toArray(children).find(
      (child) => React.isValidElement(child) && child.type === Show
    );
    return <>{showComponent}</>;
  }
  //search for Else component in children and render it
  const elseComponent = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === Else
  );
  return <>{elseComponent}</>;
}
