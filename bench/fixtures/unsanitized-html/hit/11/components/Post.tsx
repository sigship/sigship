export const Hit = ({ hit }) => <li dangerouslySetInnerHTML={{ __html: hit._highlightResult.title.value }} />;
