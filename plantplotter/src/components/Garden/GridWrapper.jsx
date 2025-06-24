'use client';
import styled from 'styled-components';

const GridWrapper = styled.ul`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  list-style: none;
  padding: 0;
  margin: 0;

  ${(props) =>
    props.VariableSizes &&
    `
    #grid-item-1 {
      grid-column: span 2;
      grid-row: span 2;
    }
    #grid-item-2 {
      grid-column: span 2;
      grid-row: span 1;
    }
    #grid-item-8 {
      grid-column: span 3;
      grid-row: span 2;
    }
    #grid-item-14 {
      grid-column: span 2;
      grid-row: span 1;
    }
  `}
`;

export default GridWrapper;