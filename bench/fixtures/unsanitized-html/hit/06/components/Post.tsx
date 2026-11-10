export const Bio = ({ data }) => <section dangerouslySetInnerHTML={{ __html: data?.bio ?? '' }} />;
