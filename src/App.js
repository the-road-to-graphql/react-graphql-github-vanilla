import React, { Component } from 'react';
import axios from 'axios';

const axiosGitHubGraphQL = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `bearer ${
      process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN
    }`,
  },
});

const title = 'Simple React GraphQL GitHub Client';

const getIssuesOfRepositoryQuery = (organization, repository) => `
  {
    organization(login: "${organization}") {
      name
      url
      repository(name: "${repository}") {
        name
        url
        issues(last: 5, states: [OPEN]) {
          edges {
            cursor
            node {
              id
              title
              url
              reactions(last: 3) {
                edges {
                  node {
                    id
                    content
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const getAddReactionToIssueMutation = issueId => `
  mutation {
    addReaction(input:{subjectId:"${issueId}",content:HOORAY}) {
      reaction {
        content
      }
      subject {
        id
      }
    }
  }
`;

const addReactionToIssue = issueId => {
  axiosGitHubGraphQL.post('/graphql', {
    query: getAddReactionToIssueMutation(issueId),
  });
};

const getIssuesOfRepository = path => {
  const [organization, repository] = path.split('/');

  return axiosGitHubGraphQL.post('/graphql', {
    query: getIssuesOfRepositoryQuery(organization, repository),
  });
};

class App extends Component {
  state = {
    input: 'the-road-to-learn-react/the-road-to-learn-react',
    result: null,
    errors: null,
  };

  componentDidMount() {
    this.onFetchGitHub(this.state.input);
  }

  onChange = event => {
    this.setState({ input: event.target.value });
  };

  onSubmit = event => {
    this.onFetchGitHub(this.state.input);

    event.preventDefault();
  };

  onFetchGitHub = input => {
    getIssuesOfRepository(input).then(result =>
      this.setState(() => ({
        result: result.data.data,
        errors: result.data.errors,
      })),
    );
  };

  render() {
    const { input, result, errors } = this.state;

    return (
      <div>
        <h1>{title}</h1>

        <form onSubmit={this.onSubmit}>
          <label htmlFor="url">
            Show open issues for https://github.com/
          </label>
          <input
            id="url"
            type="text"
            value={input}
            onChange={this.onChange}
            style={{ width: '300px' }}
          />
          <button type="submit">Search</button>
        </form>

        <hr />

        {result ? (
          <Organization
            organization={result.organization}
            errors={errors}
          />
        ) : (
          <p>No information yet ...</p>
        )}
      </div>
    );
  }
}

const Organization = ({ organization, errors }) => {
  if (errors) {
    return (
      <p>
        <strong>Something went wrong:</strong>
        {errors.map(error => error.message).join(' ')}
      </p>
    );
  }

  return (
    <div>
      <p>
        <strong>Issues from Organization:</strong>
        {organization.name} ({organization.url})
      </p>
      <Repository repository={organization.repository} />
    </div>
  );
};

const Repository = ({ repository }) => (
  <div>
    <p>
      <strong>In Repository:</strong>
      {repository.name} ({repository.url})
    </p>

    <ul>
      {repository.issues.edges.map(issue => (
        <li key={issue.node.id}>
          <a href={issue.node.url}>{issue.node.title}</a>

          <button
            type="button"
            onClick={() => addReactionToIssue(issue.node.id)}
          >
            Say "Horray"
          </button>

          <ul>
            {issue.node.reactions.edges.map(reaction => (
              <li key={reaction.node.id}>{reaction.node.content}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  </div>
);

export default App;
