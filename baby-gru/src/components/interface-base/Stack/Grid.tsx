import { Children, isValidElement } from "react";
import "./grid.css"

export const MoorhenGrid = (props: {
    children: React.ReactNode;
    gap?: string;
    rowGap?: string;
    columnGap?: string;
    columns: number;
    table?: boolean;
    style?: React.CSSProperties;
    titleRow?: boolean;
    titleColumn?: boolean;
}) => {
    const { children, gap="0.5rem", rowGap, columnGap,  columns, style = null, table, titleRow, titleColumn } = props;

    const wrappedChildren = table
        ? Children.toArray(children).map((child, index) => {
              const isAlternateStripe = Math.floor(index / columns) % 2 === 1;
              const is1stColumn = index % columns === 0;
              const is1stRow = index < columns;
              const cellClassName = `moorhen__grid-table-cell${isAlternateStripe ? " moorhen__grid-table-cell--alternate" : "" }${(is1stColumn && titleColumn) ? " moorhen__grid-table-cell--header" : ""}${(is1stRow && titleRow) ? " moorhen__grid-table-cell--header" : ""}`;
              const childKey = isValidElement(child) && child.key !== null ? child.key : index;

              return (
                  <div key={childKey} className={cellClassName}>
                      {child}
                  </div>
              );
          })
        : children;


    return (
        <div
            className={`moorhen__grid${table ? " moorhen__grid-table" : ""}`}
            style={{
                gridTemplateColumns: `repeat(${columns}, auto)`,
                rowGap: rowGap ? rowGap : gap,
                columnGap: columnGap ? columnGap : gap,
                ...style,
            }}
        >
            {wrappedChildren}
        </div>
    );
}